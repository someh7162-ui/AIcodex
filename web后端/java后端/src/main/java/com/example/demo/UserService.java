package com.example.demo;
//业务逻辑层
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class UserService {

    private final Map<String, User> users = new HashMap<>();

    public UserService() {
        // Add a default user for testing
        users.put("admin", new User("admin", "123456"));
    }

    public void register(RegisterRequest request) {
        if (users.containsKey(request.getUsername())) {
            throw new RuntimeException("User already exists");
        }
        users.put(request.getUsername(), new User(request.getUsername(), request.getPassword()));
    }

    public LoginResponse login(String username, String password) {
        User user = users.get(username);
        if (user != null && user.getPassword().equals(password)) {
            // In a real app, generate a real JWT here.
            // For this prototype, we return a dummy token that matches the frontend expectation.
            String token = UUID.randomUUID().toString();
            return new LoginResponse(token, "bearer");
        }
        throw new RuntimeException("Invalid credentials");
    }
}
