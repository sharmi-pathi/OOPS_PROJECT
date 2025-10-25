package com.trackback.model;

public class Item {
    private String id;
    private String name;
    private String description;
    private String location;
    private String contact;
    private String kind; // "found" or "lost"
    private String imageFilename; // stored filename on disk (optional)
    private String imageData; // base64 data url - accepted but not returned usually
    private String reporter;
    private String createdAt;

    public Item(){}

    // getters + setters (generate or paste)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getImageFilename() { return imageFilename; }
    public void setImageFilename(String imageFilename) { this.imageFilename = imageFilename; }
    public String getImageData() { return imageData; }
    public void setImageData(String imageData) { this.imageData = imageData; }
    public String getReporter() { return reporter; }
    public void setReporter(String reporter) { this.reporter = reporter; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
