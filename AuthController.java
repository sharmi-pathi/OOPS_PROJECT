package com.trackback.controller;

import com.trackback.service.StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StorageService storage;

    public AuthController(StorageService storage){
        this.storage = storage;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String,String> body){
        String username = body.get("username");
        String password = body.get("password");
        if(username == null || password == null) return ResponseEntity.badRequest().body(Map.of("message","username/password required"));
        try{
            boolean ok = storage.signup(username, password);
            if(!ok) return ResponseEntity.status(409).body(Map.of("message","username exists"));
            return ResponseEntity.ok(Map.of("message","created"));
        } catch(Exception e){
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message","server error"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String,String> body){
        String username = body.get("username");
        String password = body.get("password");
        if(username == null || password == null) return ResponseEntity.badRequest().body(Map.of("message","username/password required"));
        boolean ok = storage.login(username, password);
        if(ok) return ResponseEntity.ok(Map.of("message","ok"));
        return ResponseEntity.status(401).body(Map.of("message","invalid credentials"));
    }
}
