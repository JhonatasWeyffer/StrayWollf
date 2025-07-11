/* Tabela Dados dos Usuarios */
CREATE TABLE
  `users` (
    `id` int NOT NULL AUTO_INCREMENT,
    `email` varchar(255) DEFAULT NULL,
    `password` varchar(255) DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `reset_token` varchar(255) DEFAULT NULL,
    `reset_token_expires` datetime DEFAULT NULL,
    `profile_picture` varchar(255) DEFAULT NULL,
    `full_name` varchar(255) DEFAULT NULL,
    `phone` varchar(255) DEFAULT NULL,
    `cpf` varchar(255) DEFAULT NULL,
    `birth_date` varchar(255) DEFAULT NULL,
    `cep` varchar(255) DEFAULT NULL,
    `address_street` varchar(255) DEFAULT NULL,
    `address_number` varchar(255) DEFAULT NULL,
    `address_complement` varchar(255) DEFAULT NULL,
    `address_neighborhood` varchar(255) DEFAULT NULL,
    `address_city` varchar(255) DEFAULT NULL,
    `address_state` varchar(255) DEFAULT NULL,
    `refresh_token` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 1 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci



/* Tabela Dados dos Produtos */
CREATE TABLE
 `product_specs` (
    `id` int NOT NULL AUTO_INCREMENT,
    `product_id` int NOT NULL,
    `name` varchar(100) NOT NULL,
    `value` text NOT NULL,
    PRIMARY KEY (`id`),
    KEY `product_id` (`product_id`),
    CONSTRAINT `product_specs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 41 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE
  `product_variants` (
    `id` int NOT NULL AUTO_INCREMENT,
    `product_id` int NOT NULL,
    `color_name` varchar(100) NOT NULL,
    `color_code` varchar(7) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `product_id` (`product_id`),
    CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 153 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE
  `products` (
    `id` int NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `category` varchar(100) NOT NULL,
    `price` decimal(10, 2) NOT NULL,
    `original_price` decimal(10, 2) DEFAULT NULL,
    `description` text,
    `full_description` text,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB AUTO_INCREMENT = 1 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE
  `variant_images` (
    `id` int NOT NULL AUTO_INCREMENT,
    `variant_id` int NOT NULL,
    `image_url` varchar(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `variant_id` (`variant_id`),
    CONSTRAINT `variant_images_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 240 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE
  `variant_sizes` (
    `id` int NOT NULL AUTO_INCREMENT,
    `variant_id` int NOT NULL,
    `size_name` varchar(10) NOT NULL,
    `stock` int NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    KEY `variant_id` (`variant_id`),
    CONSTRAINT `variant_sizes_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
  ) ENGINE = InnoDB AUTO_INCREMENT = 183 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci

/* /KILL TABELA */
  DROP TABLE users;

/* /KILL USUARIO */
  DELETE FROM users WHERE id = 1;
  TRUNCATE TABLE users;
