package com.trackback.controller;

import com.trackback.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
public class ItemController {

    private final StorageService storage;

    public ItemController(StorageService storage){
        this.storage = storage;
    }

    @PostMapping("/report")
    public ResponseEntity<?> report(@RequestBody Map<String,String> body){
        // expected keys: id,name,description,location,contact,kind,imageData,reporter
        if(body.get("name") == null || body.get("reporter") == null) {
            return ResponseEntity.badRequest().body(Map.of("message","name and reporter required"));
        }
        try {
            storage.saveItem(body);
            // Optional: attempt to find matches and print to console
            return ResponseEntity.ok(Map.of("message","reported"));
        } catch(Exception e){
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message","server error"));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> all() {
        try {
            List<Map<String,String>> all = storage.allItems();
            return ResponseEntity.ok(all);
        } catch(Exception e){
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message","server error"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam(name="q", required=false) String q){
        try {
            List<Map<String,String>> res = storage.search(q);
            return ResponseEntity.ok(res);
        } catch(Exception e){
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message","server error"));
        }
    }

    @GetMapping("/history/{username}")
    public ResponseEntity<?> history(@PathVariable String username){
        try {
            List<Map<String,String>> res = storage.historyForUser(username);
            return ResponseEntity.ok(res);
        } catch(Exception e){
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message","server error"));
        }
    }
}
