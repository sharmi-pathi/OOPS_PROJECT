package com.trackback.service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class StorageService {

    private final Path DATA_DIR = Paths.get("data");
    private final Path USERS_FILE = DATA_DIR.resolve("users.properties");
    private final Path ITEMS_FILE = DATA_DIR.resolve("items.csv");
    private final Path IMAGES_DIR = DATA_DIR.resolve("images");
    private final Properties usersProps = new Properties();

    @PostConstruct
    public void init() throws IOException {
        if(!Files.exists(DATA_DIR)) Files.createDirectories(DATA_DIR);
        if(!Files.exists(IMAGES_DIR)) Files.createDirectories(IMAGES_DIR);
        if(!Files.exists(USERS_FILE)) Files.createFile(USERS_FILE);
        else try(InputStream in = Files.newInputStream(USERS_FILE)){ usersProps.load(in); }
        if(!Files.exists(ITEMS_FILE)){
            try(BufferedWriter w = Files.newBufferedWriter(ITEMS_FILE, StandardOpenOption.CREATE)){
                w.write("id,name,description,location,contact,kind,imageFilename,reporter,createdAt\n");
            }
        }
    }

    public synchronized boolean signup(String username, String password) throws IOException {
        if(usersProps.containsKey(username)) return false;
        usersProps.setProperty(username, password);
        try(OutputStream out = Files.newOutputStream(USERS_FILE)) { usersProps.store(out, "TrackBack users"); }
        return true;
    }

    public boolean login(String username, String password){
        String pw = usersProps.getProperty(username);
        return pw != null && pw.equals(password);
    }

    private String escCsv(String s){
        if(s==null) return "";
        String t = s.replace("\"", "\"\"");
        if(t.contains(",") || t.contains("\"") || t.contains("\n")) return "\"" + t + "\"";
        return t;
    }

    public synchronized void saveItem(Map<String,String> item) throws IOException {
        String id = item.getOrDefault("id", String.valueOf(System.currentTimeMillis()));
        String imageFilename = "";
        String imageData = item.get("imageData");
        if(imageData != null && imageData.startsWith("data:")){
            int comma = imageData.indexOf(',');
            String meta = imageData.substring(5, comma);
            String base64 = imageData.substring(comma+1);
            String ext = "png";
            if(meta.contains("image/")){
                int idx = meta.indexOf("image/");
                int semi = meta.indexOf(";", idx);
                if(semi>idx) ext = meta.substring(idx+6, semi);
            }
            byte[] bytes = Base64.getDecoder().decode(base64);
            String filename = id + "." + ext;
            Path dest = IMAGES_DIR.resolve(filename);
            Files.write(dest, bytes);
            imageFilename = filename;
        }
        String createdAt = ZonedDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        StringBuilder sb = new StringBuilder();
        sb.append(id).append(",")
          .append(escCsv(item.get("name"))).append(",")
          .append(escCsv(item.get("description"))).append(",")
          .append(escCsv(item.get("location"))).append(",")
          .append(escCsv(item.get("contact"))).append(",")
          .append(item.getOrDefault("kind","")).append(",")
          .append(escCsv(imageFilename)).append(",")
          .append(escCsv(item.get("reporter"))).append(",")
          .append(escCsv(createdAt));
        try(BufferedWriter w = Files.newBufferedWriter(ITEMS_FILE, StandardOpenOption.APPEND)){
            w.write(sb.toString()); w.newLine();
        }
    }

    // simple CSV parser
    private List<String> parseCSVLine(String line){
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for(int i=0;i<line.length();i++){
            char c = line.charAt(i);
            if(inQuotes){
                if(c == '"'){
                    if(i+1 < line.length() && line.charAt(i+1) == '"'){ cur.append('"'); i++; }
                    else inQuotes = false;
                } else cur.append(c);
            } else {
                if(c == '"') inQuotes = true;
                else if(c == ','){ out.add(cur.toString()); cur.setLength(0); }
                else cur.append(c);
            }
        }
        out.add(cur.toString());
        return out;
    }

    public synchronized List<Map<String,String>> allItems() throws IOException {
        List<Map<String,String>> res = new ArrayList<>();
        try(BufferedReader r = Files.newBufferedReader(ITEMS_FILE)){
            r.readLine(); // header
            String line;
            while((line = r.readLine()) != null){
                List<String> f = parseCSVLine(line);
                if(f.size() < 9) continue;
                Map<String,String> m = new HashMap<>();
                m.put("id", f.get(0));
                m.put("name", f.get(1));
                m.put("description", f.get(2));
                m.put("location", f.get(3));
                m.put("contact", f.get(4));
                m.put("kind", f.get(5));
                m.put("imageFilename", f.get(6));
                m.put("reporter", f.get(7));
                m.put("createdAt", f.get(8));
                res.add(m);
            }
        }
        return res;
    }

    public synchronized List<Map<String,String>> search(String q) throws IOException {
        List<Map<String,String>> all = allItems();
        if(q == null || q.trim().isEmpty()) return all;
        String lower = q.toLowerCase();
        List<Map<String,String>> out = new ArrayList<>();
        for(Map<String,String> m : all){
            if(m.get("name") != null && m.get("name").toLowerCase().contains(lower)) out.add(m);
        }
        return out;
    }

    public synchronized List<Map<String,String>> historyForUser(String username) throws IOException {
        List<Map<String,String>> all = allItems();
        List<Map<String,String>> out = new ArrayList<>();
        for(Map<String,String> m : all){
            if(username != null && username.equals(m.get("reporter"))) out.add(m);
        }
        return out;
    }
}
