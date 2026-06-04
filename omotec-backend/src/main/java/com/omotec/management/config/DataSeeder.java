package com.omotec.management.config;

import com.omotec.management.model.User;
import com.omotec.management.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.deleteAll();
            userRepository.save(new User("trainer1", passwordEncoder.encode("trainer123"), "TRAINER", "Vaibhao Badhe", "trainer1@omotec.com", "9876543210"));
            userRepository.save(new User("trainer2", passwordEncoder.encode("trainer123"), "TRAINER", "Princy Sharma", "trainer2@omotec.com", "9876543215"));
            userRepository.save(new User("inventory1", passwordEncoder.encode("inventory123"), "INVENTORY", "Inventory Manager", "inventory1@omotec.com", "9876543211"));
            userRepository.save(new User("manager1", passwordEncoder.encode("manager123"), "MANAGER", "Manager Admin", "manager1@omotec.com", "9876543212"));
            System.out.println("=== SEEDED " + userRepository.count() + " USERS ===");
        };
    }
}

