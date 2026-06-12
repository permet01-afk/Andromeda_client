-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 12 juin 2026 à 21:51
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `andromeda`
--

-- --------------------------------------------------------

--
-- Structure de la table `auction_bids`
--

CREATE TABLE `auction_bids` (
  `id` bigint(20) NOT NULL,
  `lot_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `bid_credits` bigint(20) NOT NULL,
  `previous_bidder_id` int(11) DEFAULT NULL,
  `previous_bid_credits` bigint(20) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `auction_bids`
--

INSERT INTO `auction_bids` (`id`, `lot_id`, `player_id`, `bid_credits`, `previous_bidder_id`, `previous_bid_credits`, `created_at`) VALUES
(1, 41, 1, 1200001, NULL, 1200000, '2026-04-25 18:18:16'),
(2, 49, 1, 4000001, NULL, 4000000, '2026-04-25 18:18:29'),
(3, 48, 1, 4000001, NULL, 4000000, '2026-04-25 18:18:33'),
(4, 50, 1, 5000001, NULL, 5000000, '2026-04-25 18:18:35'),
(5, 51, 1, 60001, NULL, 60000, '2026-04-25 18:18:43'),
(6, 61, 1, 20000001, NULL, 20000000, '2026-04-25 18:18:56'),
(7, 62, 1, 20000001, NULL, 20000000, '2026-04-25 18:18:58');

-- --------------------------------------------------------

--
-- Structure de la table `auction_items`
--

CREATE TABLE `auction_items` (
  `id` int(11) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `category` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `grant_type` varchar(32) NOT NULL,
  `ref_id` varchar(64) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `uridium_value` int(11) NOT NULL DEFAULT 0,
  `starting_bid_credits` bigint(20) NOT NULL DEFAULT 0,
  `min_increment_credits` bigint(20) NOT NULL DEFAULT 1,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `auction_items`
--

INSERT INTO `auction_items` (`id`, `code`, `name`, `category`, `description`, `image_path`, `grant_type`, `ref_id`, `qty`, `uridium_value`, `starting_bid_credits`, `min_increment_credits`, `enabled`, `sort_order`, `updated_at`) VALUES
(1, 'lf3', 'LF-3 Laser', 'Equipment', 'Elite laser cannon.', 'img/items/lf3.png', 'inventory_item', '1', 1, 10000, 4000000, 1, 1, 10, '2026-04-24 22:35:23'),
(2, 'bo2', 'SG3N-B02 Shield', 'Equipment', '10,000 shield generator.', 'img/items/sg3n.png', 'inventory_item', '2', 1, 10000, 4000000, 1, 1, 20, '2026-04-24 23:19:34'),
(3, 'speed_7900', 'G3N-7900 Speed Generator', 'Equipment', '+10 speed generator.', 'img/items/g3n7900.png', 'inventory_item', '4', 1, 2000, 800000, 1, 1, 30, '2026-04-24 22:35:23'),
(4, 'auto_rocket_cpu', 'Auto-Rocket CPU', 'Equipment', 'Fires rockets automatically.', 'img/items/arol.png', 'inventory_item', '20', 1, 15000, 6000000, 1, 1, 40, '2026-04-24 22:35:23'),
(5, 'cargo_compressor', 'Cargo Compressor', 'Equipment', 'Doubles cargo space.', 'img/items/cargo.png', 'inventory_item', '21', 1, 15000, 6000000, 1, 1, 50, '2026-04-24 22:35:23'),
(6, 'hst2', 'HST-2', 'Equipment', 'Elite rocket launcher.', 'img/items/hst2.png', 'inventory_item', '39', 1, 15000, 6000000, 1, 1, 60, '2026-04-24 22:35:23'),
(7, 'iris', 'Iris Drone', 'Drones', 'Elite drone with 2 slots.', 'img/items/iris.png', 'iris', '3', 1, 15000, 250000000, 1, 1, 100, '2026-04-24 22:35:23'),
(8, 'mcb50_3000', 'MCB-50', 'Laser Ammunition', 'Lot of 3,000 laser ammo.', 'img/items/mcb50.png', 'user_column', 'ammo_mcb50', 3000, 3000, 1200000, 1, 1, 200, '2026-04-24 22:35:23'),
(9, 'sab50_3000', 'SAB-50', 'Laser Ammunition', 'Lot of 3,000 shield-drain ammo.', 'img/items/sab50.png', 'user_column', 'ammo_sab50', 3000, 3000, 1200000, 1, 1, 210, '2026-04-24 22:35:23'),
(10, 'rsb75_3000', 'RSB-75', 'Laser Ammunition', 'Lot of 3,000 elite laser ammo.', 'img/items/rsb75.png', 'user_column', 'ammo_rsb75', 3000, 15000, 6000000, 1, 1, 220, '2026-04-24 22:35:23'),
(11, 'plt2021_1000', 'PLT-2021', 'Rockets', 'Lot of 1,000 rockets.', 'img/items/plt2021.png', 'user_column', 'ammo_plt2021', 1000, 5000, 2000000, 1, 1, 300, '2026-04-24 22:35:23'),
(12, 'dcr250_1000', 'DCR-250', 'Rockets', 'Lot of 1,000 slow-down rockets.', 'img/items/dcr250.png', 'user_column', 'ammo_dcr250', 1000, 5000, 2000000, 1, 1, 310, '2026-04-24 22:35:23'),
(13, 'ubr100_1000', 'UBR-100', 'Rockets', 'Lot of 1,000 elite rockets.', 'img/items/ubr100.png', 'user_column', 'ammo_ubr100', 1000, 30000, 12000000, 1, 1, 320, '2026-04-24 22:35:23'),
(14, 'hstrm01_1000', 'HSTRM-01', 'Rockets', 'Lot of 1,000 Hellstorm rockets.', 'img/items/hstrm01.png', 'user_column', 'ammo_hstrm01', 1000, 25000, 10000000, 1, 1, 330, '2026-04-24 22:35:23'),
(15, 'smb01_25', 'SMB-01', 'Special Items', 'Lot of 25 instant mines.', 'img/items/smb-01.png', 'user_column', 'ammo_smb01', 25, 10000, 4000000, 1, 1, 400, '2026-04-24 22:35:23'),
(16, 'ish01_25', 'ISH-01', 'Special Items', 'Lot of 25 instant shields.', 'img/items/ish-01.png', 'user_column', 'ammo_ish01', 25, 10000, 4000000, 1, 1, 410, '2026-04-24 22:35:23'),
(17, 'emp01_25', 'EMP-01', 'Special Items', 'Lot of 25 EMP bursts.', 'img/items/emp-01.png', 'user_column', 'ammo_emp01', 25, 12500, 5000000, 1, 1, 420, '2026-04-24 22:35:23'),
(18, 'logfile', 'Logfile', 'Resources', '1 Logfile.', 'img/items/logfile.png', 'user_column', 'logfiles', 1, 150, 60000, 1, 1, 500, '2026-04-24 22:35:23'),
(19, 'booty_key', 'Booty Key', 'Resources', '1 Booty Key.', 'img/items/booty-key.png', 'user_column', 'booty_keys', 1, 7000, 2800000, 1, 1, 510, '2026-04-24 22:35:23'),
(20, 'vengeance_enforcer', 'Vengeance Enforcer', 'Ship Designs', 'Vengeance design. +5% Damage.', 'img/shop/17.png', 'design', '17', 1, 50000, 20000000, 1, 1, 600, '2026-04-24 22:35:23'),
(21, 'goliath_enforcer', 'Goliath Enforcer', 'Ship Designs', 'Goliath design. +5% Damage.', 'img/shop/56.png', 'design', '56', 1, 100000, 40000000, 1, 1, 610, '2026-04-24 22:35:23'),
(22, 'goliath_bastion', 'Goliath Bastion', 'Ship Designs', 'Goliath design. +10% Shield.', 'img/shop/59.png', 'design', '59', 1, 100000, 40000000, 1, 1, 620, '2026-04-24 22:35:23'),
(23, 'goliath_solace', 'Goliath Solace', 'Ship Designs', 'Goliath ability design.', 'img/shop/63.png', 'design', '63', 1, 250000, 100000000, 1, 1, 630, '2026-04-24 22:35:23'),
(24, 'goliath_diminisher', 'Goliath Diminisher', 'Ship Designs', 'Goliath ability design.', 'img/shop/64.png', 'design', '64', 1, 250000, 100000000, 1, 1, 640, '2026-04-24 22:35:23'),
(25, 'goliath_spectrum', 'Goliath Spectrum', 'Ship Designs', 'Goliath ability design.', 'img/shop/65.png', 'design', '65', 1, 250000, 100000000, 1, 1, 650, '2026-04-24 22:35:23'),
(26, 'goliath_sentinel', 'Goliath Sentinel', 'Ship Designs', 'Goliath ability design.', 'img/shop/66.png', 'design', '66', 1, 250000, 100000000, 1, 1, 660, '2026-04-24 22:35:23'),
(27, 'goliath_venom', 'Goliath Venom', 'Ship Designs', 'Goliath ability design.', 'img/shop/67.png', 'design', '67', 1, 250000, 100000000, 1, 1, 670, '2026-04-24 22:35:23'),
(28, 'damage_booster_1h', 'Damage Booster', 'Boosters', '+10% Damage for 5 hours.', 'img/dmg.png', 'booster', 'booster_dmg_time', 5, 50000, 20000000, 1, 1, 700, '2026-04-25 13:02:15'),
(29, 'hp_booster_1h', 'HP Booster', 'Boosters', '+10% Hitpoints for 5 hours.', 'img/hp.png', 'booster', 'booster_hp_time', 5, 50000, 20000000, 1, 1, 710, '2026-04-25 13:02:15'),
(30, 'shield_booster_1h', 'Shield Booster', 'Boosters', '+25% Shield for 5 hours.', 'img/sh.png', 'booster', 'booster_shd_time', 5, 50000, 20000000, 1, 1, 720, '2026-04-25 13:02:15'),
(31, 'leonov', 'Leonov', 'Ships', 'Ship reward. It will be equipped on win.', 'img/shop/3.png', 'ship', '3', 1, 9000, 3600000, 1, 1, 800, '2026-04-24 22:35:23'),
(32, 'vengeance', 'Vengeance', 'Ships', 'Ship reward. It will be equipped on win.', 'img/shop/8.png', 'ship', '8', 1, 30000, 12000000, 1, 1, 810, '2026-04-24 22:35:23'),
(33, 'goliath', 'Goliath', 'Ships', 'Ship reward. It will be equipped on win.', 'img/shop/10.png', 'ship', '10', 1, 80000, 32000000, 1, 1, 820, '2026-04-24 22:35:23'),
(2132, 'promerium_2000', 'Promerium', 'Resources', 'Lot of 2,000 Promerium ore.', 'img/items/promerium.png', 'cargo_ore', 'promerium', 2000, 0, 3000000, 1, 1, 520, '2026-06-11 16:33:42');

-- --------------------------------------------------------

--
-- Structure de la table `auction_lots`
--

CREATE TABLE `auction_lots` (
  `id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `auction_item_id` int(11) NOT NULL,
  `starting_bid_credits` bigint(20) NOT NULL DEFAULT 0,
  `min_increment_credits` bigint(20) NOT NULL DEFAULT 1,
  `current_bid_credits` bigint(20) NOT NULL DEFAULT 0,
  `current_bidder_id` int(11) DEFAULT NULL,
  `settled` tinyint(1) NOT NULL DEFAULT 0,
  `settled_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `auction_lots`
--

INSERT INTO `auction_lots` (`id`, `round_id`, `auction_item_id`, `starting_bid_credits`, `min_increment_credits`, `current_bid_credits`, `current_bidder_id`, `settled`, `settled_at`) VALUES
(1, 1, 1, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(2, 1, 2, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(3, 1, 3, 800000, 1, 800000, NULL, 1, '2026-04-25 13:01:42'),
(4, 1, 4, 6000000, 1, 6000000, NULL, 1, '2026-04-25 13:01:42'),
(5, 1, 5, 6000000, 1, 6000000, NULL, 1, '2026-04-25 13:01:42'),
(6, 1, 6, 6000000, 1, 6000000, NULL, 1, '2026-04-25 13:01:42'),
(7, 1, 7, 250000000, 1, 250000000, NULL, 1, '2026-04-25 13:01:42'),
(8, 1, 8, 1200000, 1, 1200000, NULL, 1, '2026-04-25 13:01:42'),
(9, 1, 9, 1200000, 1, 1200000, NULL, 1, '2026-04-25 13:01:42'),
(10, 1, 10, 6000000, 1, 6000000, NULL, 1, '2026-04-25 13:01:42'),
(11, 1, 11, 2000000, 1, 2000000, NULL, 1, '2026-04-25 13:01:42'),
(12, 1, 12, 2000000, 1, 2000000, NULL, 1, '2026-04-25 13:01:42'),
(13, 1, 13, 12000000, 1, 12000000, NULL, 1, '2026-04-25 13:01:42'),
(14, 1, 14, 10000000, 1, 10000000, NULL, 1, '2026-04-25 13:01:42'),
(15, 1, 15, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(16, 1, 16, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(17, 1, 17, 5000000, 1, 5000000, NULL, 1, '2026-04-25 13:01:42'),
(18, 1, 18, 60000, 1, 60000, NULL, 1, '2026-04-25 13:01:42'),
(19, 1, 19, 2800000, 1, 2800000, NULL, 1, '2026-04-25 13:01:42'),
(20, 1, 20, 20000000, 1, 20000000, NULL, 1, '2026-04-25 13:01:42'),
(21, 1, 21, 40000000, 1, 40000000, NULL, 1, '2026-04-25 13:01:42'),
(22, 1, 22, 40000000, 1, 40000000, NULL, 1, '2026-04-25 13:01:42'),
(23, 1, 23, 100000000, 1, 100000000, NULL, 1, '2026-04-25 13:01:42'),
(24, 1, 24, 100000000, 1, 100000000, NULL, 1, '2026-04-25 13:01:42'),
(25, 1, 25, 100000000, 1, 100000000, NULL, 1, '2026-04-25 13:01:42'),
(26, 1, 26, 100000000, 1, 100000000, NULL, 1, '2026-04-25 13:01:42'),
(27, 1, 27, 100000000, 1, 100000000, NULL, 1, '2026-04-25 13:01:42'),
(28, 1, 28, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(29, 1, 29, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(30, 1, 30, 4000000, 1, 4000000, NULL, 1, '2026-04-25 13:01:42'),
(31, 1, 31, 3600000, 1, 3600000, NULL, 1, '2026-04-25 13:01:42'),
(32, 1, 32, 12000000, 1, 12000000, NULL, 1, '2026-04-25 13:01:42'),
(33, 1, 33, 32000000, 1, 32000000, NULL, 1, '2026-04-25 13:01:42'),
(34, 2, 1, 4000000, 1, 4000000, NULL, 1, '2026-04-26 18:11:34'),
(35, 2, 2, 4000000, 1, 4000000, NULL, 1, '2026-04-26 18:11:34'),
(36, 2, 3, 800000, 1, 800000, NULL, 1, '2026-04-26 18:11:34'),
(37, 2, 4, 6000000, 1, 6000000, NULL, 1, '2026-04-26 18:11:34'),
(38, 2, 5, 6000000, 1, 6000000, NULL, 1, '2026-04-26 18:11:34'),
(39, 2, 6, 6000000, 1, 6000000, NULL, 1, '2026-04-26 18:11:34'),
(40, 2, 7, 250000000, 1, 250000000, NULL, 1, '2026-04-26 18:11:34'),
(41, 2, 8, 1200000, 1, 1200001, 1, 1, '2026-04-26 18:11:34'),
(42, 2, 9, 1200000, 1, 1200000, NULL, 1, '2026-04-26 18:11:34'),
(43, 2, 10, 6000000, 1, 6000000, NULL, 1, '2026-04-26 18:11:34'),
(44, 2, 11, 2000000, 1, 2000000, NULL, 1, '2026-04-26 18:11:34'),
(45, 2, 12, 2000000, 1, 2000000, NULL, 1, '2026-04-26 18:11:34'),
(46, 2, 13, 12000000, 1, 12000000, NULL, 1, '2026-04-26 18:11:34'),
(47, 2, 14, 10000000, 1, 10000000, NULL, 1, '2026-04-26 18:11:34'),
(48, 2, 15, 4000000, 1, 4000001, 1, 1, '2026-04-26 18:11:34'),
(49, 2, 16, 4000000, 1, 4000001, 1, 1, '2026-04-26 18:11:34'),
(50, 2, 17, 5000000, 1, 5000001, 1, 1, '2026-04-26 18:11:34'),
(51, 2, 18, 60000, 1, 60001, 1, 1, '2026-04-26 18:11:34'),
(52, 2, 19, 2800000, 1, 2800000, NULL, 1, '2026-04-26 18:11:34'),
(53, 2, 20, 20000000, 1, 20000000, NULL, 1, '2026-04-26 18:11:34'),
(54, 2, 21, 40000000, 1, 40000000, NULL, 1, '2026-04-26 18:11:34'),
(55, 2, 22, 40000000, 1, 40000000, NULL, 1, '2026-04-26 18:11:34'),
(56, 2, 23, 100000000, 1, 100000000, NULL, 1, '2026-04-26 18:11:34'),
(57, 2, 24, 100000000, 1, 100000000, NULL, 1, '2026-04-26 18:11:34'),
(58, 2, 25, 100000000, 1, 100000000, NULL, 1, '2026-04-26 18:11:34'),
(59, 2, 26, 100000000, 1, 100000000, NULL, 1, '2026-04-26 18:11:34'),
(60, 2, 27, 100000000, 1, 100000000, NULL, 1, '2026-04-26 18:11:34'),
(61, 2, 28, 20000000, 1, 20000001, 1, 1, '2026-04-26 18:11:34'),
(62, 2, 29, 20000000, 1, 20000001, 1, 1, '2026-04-26 18:11:34'),
(63, 2, 30, 20000000, 1, 20000000, NULL, 1, '2026-04-26 18:11:34'),
(64, 2, 31, 3600000, 1, 3600000, NULL, 1, '2026-04-26 18:11:34'),
(65, 2, 32, 12000000, 1, 12000000, NULL, 1, '2026-04-26 18:11:34'),
(66, 2, 33, 32000000, 1, 32000000, NULL, 1, '2026-04-26 18:11:34'),
(397, 3, 1, 4000000, 1, 4000000, NULL, 1, '2026-04-26 19:01:49'),
(398, 3, 2, 4000000, 1, 4000000, NULL, 1, '2026-04-26 19:01:49'),
(399, 3, 3, 800000, 1, 800000, NULL, 1, '2026-04-26 19:01:49'),
(400, 3, 4, 6000000, 1, 6000000, NULL, 1, '2026-04-26 19:01:49'),
(401, 3, 5, 6000000, 1, 6000000, NULL, 1, '2026-04-26 19:01:49'),
(402, 3, 6, 6000000, 1, 6000000, NULL, 1, '2026-04-26 19:01:49'),
(403, 3, 7, 250000000, 1, 250000000, NULL, 1, '2026-04-26 19:01:49'),
(404, 3, 8, 1200000, 1, 1200000, NULL, 1, '2026-04-26 19:01:49'),
(405, 3, 9, 1200000, 1, 1200000, NULL, 1, '2026-04-26 19:01:49'),
(406, 3, 10, 6000000, 1, 6000000, NULL, 1, '2026-04-26 19:01:49'),
(407, 3, 11, 2000000, 1, 2000000, NULL, 1, '2026-04-26 19:01:49'),
(408, 3, 12, 2000000, 1, 2000000, NULL, 1, '2026-04-26 19:01:49'),
(409, 3, 13, 12000000, 1, 12000000, NULL, 1, '2026-04-26 19:01:49'),
(410, 3, 14, 10000000, 1, 10000000, NULL, 1, '2026-04-26 19:01:49'),
(411, 3, 15, 4000000, 1, 4000000, NULL, 1, '2026-04-26 19:01:49'),
(412, 3, 16, 4000000, 1, 4000000, NULL, 1, '2026-04-26 19:01:49'),
(413, 3, 17, 5000000, 1, 5000000, NULL, 1, '2026-04-26 19:01:49'),
(414, 3, 18, 60000, 1, 60000, NULL, 1, '2026-04-26 19:01:49'),
(415, 3, 19, 2800000, 1, 2800000, NULL, 1, '2026-04-26 19:01:49'),
(416, 3, 20, 20000000, 1, 20000000, NULL, 1, '2026-04-26 19:01:49'),
(417, 3, 21, 40000000, 1, 40000000, NULL, 1, '2026-04-26 19:01:49'),
(418, 3, 22, 40000000, 1, 40000000, NULL, 1, '2026-04-26 19:01:49'),
(419, 3, 23, 100000000, 1, 100000000, NULL, 1, '2026-04-26 19:01:49'),
(420, 3, 24, 100000000, 1, 100000000, NULL, 1, '2026-04-26 19:01:49'),
(421, 3, 25, 100000000, 1, 100000000, NULL, 1, '2026-04-26 19:01:49'),
(422, 3, 26, 100000000, 1, 100000000, NULL, 1, '2026-04-26 19:01:49'),
(423, 3, 27, 100000000, 1, 100000000, NULL, 1, '2026-04-26 19:01:49'),
(424, 3, 28, 20000000, 1, 20000000, NULL, 1, '2026-04-26 19:01:49'),
(425, 3, 29, 20000000, 1, 20000000, NULL, 1, '2026-04-26 19:01:49'),
(426, 3, 30, 20000000, 1, 20000000, NULL, 1, '2026-04-26 19:01:49'),
(427, 3, 31, 3600000, 1, 3600000, NULL, 1, '2026-04-26 19:01:49'),
(428, 3, 32, 12000000, 1, 12000000, NULL, 1, '2026-04-26 19:01:49'),
(429, 3, 33, 32000000, 1, 32000000, NULL, 1, '2026-04-26 19:01:49'),
(430, 4, 1, 4000000, 1, 4000000, NULL, 1, '2026-04-27 01:43:29'),
(431, 4, 2, 4000000, 1, 4000000, NULL, 1, '2026-04-27 01:43:29'),
(432, 4, 3, 800000, 1, 800000, NULL, 1, '2026-04-27 01:43:29'),
(433, 4, 4, 6000000, 1, 6000000, NULL, 1, '2026-04-27 01:43:29'),
(434, 4, 5, 6000000, 1, 6000000, NULL, 1, '2026-04-27 01:43:29'),
(435, 4, 6, 6000000, 1, 6000000, NULL, 1, '2026-04-27 01:43:29'),
(436, 4, 7, 250000000, 1, 250000000, NULL, 1, '2026-04-27 01:43:29'),
(437, 4, 8, 1200000, 1, 1200000, NULL, 1, '2026-04-27 01:43:29'),
(438, 4, 9, 1200000, 1, 1200000, NULL, 1, '2026-04-27 01:43:29'),
(439, 4, 10, 6000000, 1, 6000000, NULL, 1, '2026-04-27 01:43:29'),
(440, 4, 11, 2000000, 1, 2000000, NULL, 1, '2026-04-27 01:43:29'),
(441, 4, 12, 2000000, 1, 2000000, NULL, 1, '2026-04-27 01:43:29'),
(442, 4, 13, 12000000, 1, 12000000, NULL, 1, '2026-04-27 01:43:29'),
(443, 4, 14, 10000000, 1, 10000000, NULL, 1, '2026-04-27 01:43:29'),
(444, 4, 15, 4000000, 1, 4000000, NULL, 1, '2026-04-27 01:43:29'),
(445, 4, 16, 4000000, 1, 4000000, NULL, 1, '2026-04-27 01:43:29'),
(446, 4, 17, 5000000, 1, 5000000, NULL, 1, '2026-04-27 01:43:29'),
(447, 4, 18, 60000, 1, 60000, NULL, 1, '2026-04-27 01:43:29'),
(448, 4, 19, 2800000, 1, 2800000, NULL, 1, '2026-04-27 01:43:29'),
(449, 4, 20, 20000000, 1, 20000000, NULL, 1, '2026-04-27 01:43:29'),
(450, 4, 21, 40000000, 1, 40000000, NULL, 1, '2026-04-27 01:43:29'),
(451, 4, 22, 40000000, 1, 40000000, NULL, 1, '2026-04-27 01:43:29'),
(452, 4, 23, 100000000, 1, 100000000, NULL, 1, '2026-04-27 01:43:29'),
(453, 4, 24, 100000000, 1, 100000000, NULL, 1, '2026-04-27 01:43:29'),
(454, 4, 25, 100000000, 1, 100000000, NULL, 1, '2026-04-27 01:43:29'),
(455, 4, 26, 100000000, 1, 100000000, NULL, 1, '2026-04-27 01:43:29'),
(456, 4, 27, 100000000, 1, 100000000, NULL, 1, '2026-04-27 01:43:29'),
(457, 4, 28, 20000000, 1, 20000000, NULL, 1, '2026-04-27 01:43:29'),
(458, 4, 29, 20000000, 1, 20000000, NULL, 1, '2026-04-27 01:43:29'),
(459, 4, 30, 20000000, 1, 20000000, NULL, 1, '2026-04-27 01:43:29'),
(460, 4, 31, 3600000, 1, 3600000, NULL, 1, '2026-04-27 01:43:29'),
(461, 4, 32, 12000000, 1, 12000000, NULL, 1, '2026-04-27 01:43:29'),
(462, 4, 33, 32000000, 1, 32000000, NULL, 1, '2026-04-27 01:43:29'),
(463, 5, 1, 4000000, 1, 4000000, NULL, 1, '2026-05-08 04:14:36'),
(464, 5, 2, 4000000, 1, 4000000, NULL, 1, '2026-05-08 04:14:36'),
(465, 5, 3, 800000, 1, 800000, NULL, 1, '2026-05-08 04:14:36'),
(466, 5, 4, 6000000, 1, 6000000, NULL, 1, '2026-05-08 04:14:36'),
(467, 5, 5, 6000000, 1, 6000000, NULL, 1, '2026-05-08 04:14:36'),
(468, 5, 6, 6000000, 1, 6000000, NULL, 1, '2026-05-08 04:14:36'),
(469, 5, 7, 250000000, 1, 250000000, NULL, 1, '2026-05-08 04:14:36'),
(470, 5, 8, 1200000, 1, 1200000, NULL, 1, '2026-05-08 04:14:36'),
(471, 5, 9, 1200000, 1, 1200000, NULL, 1, '2026-05-08 04:14:36'),
(472, 5, 10, 6000000, 1, 6000000, NULL, 1, '2026-05-08 04:14:36'),
(473, 5, 11, 2000000, 1, 2000000, NULL, 1, '2026-05-08 04:14:36'),
(474, 5, 12, 2000000, 1, 2000000, NULL, 1, '2026-05-08 04:14:36'),
(475, 5, 13, 12000000, 1, 12000000, NULL, 1, '2026-05-08 04:14:36'),
(476, 5, 14, 10000000, 1, 10000000, NULL, 1, '2026-05-08 04:14:36'),
(477, 5, 15, 4000000, 1, 4000000, NULL, 1, '2026-05-08 04:14:36'),
(478, 5, 16, 4000000, 1, 4000000, NULL, 1, '2026-05-08 04:14:36'),
(479, 5, 17, 5000000, 1, 5000000, NULL, 1, '2026-05-08 04:14:36'),
(480, 5, 18, 60000, 1, 60000, NULL, 1, '2026-05-08 04:14:36'),
(481, 5, 19, 2800000, 1, 2800000, NULL, 1, '2026-05-08 04:14:36'),
(482, 5, 20, 20000000, 1, 20000000, NULL, 1, '2026-05-08 04:14:36'),
(483, 5, 21, 40000000, 1, 40000000, NULL, 1, '2026-05-08 04:14:36'),
(484, 5, 22, 40000000, 1, 40000000, NULL, 1, '2026-05-08 04:14:36'),
(485, 5, 23, 100000000, 1, 100000000, NULL, 1, '2026-05-08 04:14:36'),
(486, 5, 24, 100000000, 1, 100000000, NULL, 1, '2026-05-08 04:14:36'),
(487, 5, 25, 100000000, 1, 100000000, NULL, 1, '2026-05-08 04:14:36'),
(488, 5, 26, 100000000, 1, 100000000, NULL, 1, '2026-05-08 04:14:36'),
(489, 5, 27, 100000000, 1, 100000000, NULL, 1, '2026-05-08 04:14:36'),
(490, 5, 28, 20000000, 1, 20000000, NULL, 1, '2026-05-08 04:14:36'),
(491, 5, 29, 20000000, 1, 20000000, NULL, 1, '2026-05-08 04:14:36'),
(492, 5, 30, 20000000, 1, 20000000, NULL, 1, '2026-05-08 04:14:36'),
(493, 5, 31, 3600000, 1, 3600000, NULL, 1, '2026-05-08 04:14:36'),
(494, 5, 32, 12000000, 1, 12000000, NULL, 1, '2026-05-08 04:14:36'),
(495, 5, 33, 32000000, 1, 32000000, NULL, 1, '2026-05-08 04:14:36'),
(496, 6, 1, 4000000, 1, 4000000, NULL, 1, '2026-05-23 21:27:36'),
(497, 6, 2, 4000000, 1, 4000000, NULL, 1, '2026-05-23 21:27:36'),
(498, 6, 3, 800000, 1, 800000, NULL, 1, '2026-05-23 21:27:36'),
(499, 6, 4, 6000000, 1, 6000000, NULL, 1, '2026-05-23 21:27:36'),
(500, 6, 5, 6000000, 1, 6000000, NULL, 1, '2026-05-23 21:27:36'),
(501, 6, 6, 6000000, 1, 6000000, NULL, 1, '2026-05-23 21:27:36'),
(502, 6, 7, 250000000, 1, 250000000, NULL, 1, '2026-05-23 21:27:36'),
(503, 6, 8, 1200000, 1, 1200000, NULL, 1, '2026-05-23 21:27:36'),
(504, 6, 9, 1200000, 1, 1200000, NULL, 1, '2026-05-23 21:27:36'),
(505, 6, 10, 6000000, 1, 6000000, NULL, 1, '2026-05-23 21:27:36'),
(506, 6, 11, 2000000, 1, 2000000, NULL, 1, '2026-05-23 21:27:36'),
(507, 6, 12, 2000000, 1, 2000000, NULL, 1, '2026-05-23 21:27:36'),
(508, 6, 13, 12000000, 1, 12000000, NULL, 1, '2026-05-23 21:27:36'),
(509, 6, 14, 10000000, 1, 10000000, NULL, 1, '2026-05-23 21:27:36'),
(510, 6, 15, 4000000, 1, 4000000, NULL, 1, '2026-05-23 21:27:36'),
(511, 6, 16, 4000000, 1, 4000000, NULL, 1, '2026-05-23 21:27:36'),
(512, 6, 17, 5000000, 1, 5000000, NULL, 1, '2026-05-23 21:27:36'),
(513, 6, 18, 60000, 1, 60000, NULL, 1, '2026-05-23 21:27:36'),
(514, 6, 19, 2800000, 1, 2800000, NULL, 1, '2026-05-23 21:27:36'),
(515, 6, 20, 20000000, 1, 20000000, NULL, 1, '2026-05-23 21:27:36'),
(516, 6, 21, 40000000, 1, 40000000, NULL, 1, '2026-05-23 21:27:36'),
(517, 6, 22, 40000000, 1, 40000000, NULL, 1, '2026-05-23 21:27:36'),
(518, 6, 23, 100000000, 1, 100000000, NULL, 1, '2026-05-23 21:27:36'),
(519, 6, 24, 100000000, 1, 100000000, NULL, 1, '2026-05-23 21:27:36'),
(520, 6, 25, 100000000, 1, 100000000, NULL, 1, '2026-05-23 21:27:36'),
(521, 6, 26, 100000000, 1, 100000000, NULL, 1, '2026-05-23 21:27:36'),
(522, 6, 27, 100000000, 1, 100000000, NULL, 1, '2026-05-23 21:27:36'),
(523, 6, 28, 20000000, 1, 20000000, NULL, 1, '2026-05-23 21:27:36'),
(524, 6, 29, 20000000, 1, 20000000, NULL, 1, '2026-05-23 21:27:36'),
(525, 6, 30, 20000000, 1, 20000000, NULL, 1, '2026-05-23 21:27:36'),
(526, 6, 31, 3600000, 1, 3600000, NULL, 1, '2026-05-23 21:27:36'),
(527, 6, 32, 12000000, 1, 12000000, NULL, 1, '2026-05-23 21:27:36'),
(528, 6, 33, 32000000, 1, 32000000, NULL, 1, '2026-05-23 21:27:36'),
(529, 7, 1, 4000000, 1, 4000000, NULL, 1, '2026-06-11 19:01:53'),
(530, 7, 2, 4000000, 1, 4000000, NULL, 1, '2026-06-11 19:01:53'),
(531, 7, 3, 800000, 1, 800000, NULL, 1, '2026-06-11 19:01:53'),
(532, 7, 4, 6000000, 1, 6000000, NULL, 1, '2026-06-11 19:01:53'),
(533, 7, 5, 6000000, 1, 6000000, NULL, 1, '2026-06-11 19:01:53'),
(534, 7, 6, 6000000, 1, 6000000, NULL, 1, '2026-06-11 19:01:53'),
(535, 7, 7, 250000000, 1, 250000000, NULL, 1, '2026-06-11 19:01:53'),
(536, 7, 8, 1200000, 1, 1200000, NULL, 1, '2026-06-11 19:01:53'),
(537, 7, 9, 1200000, 1, 1200000, NULL, 1, '2026-06-11 19:01:53'),
(538, 7, 10, 6000000, 1, 6000000, NULL, 1, '2026-06-11 19:01:53'),
(539, 7, 11, 2000000, 1, 2000000, NULL, 1, '2026-06-11 19:01:53'),
(540, 7, 12, 2000000, 1, 2000000, NULL, 1, '2026-06-11 19:01:53'),
(541, 7, 13, 12000000, 1, 12000000, NULL, 1, '2026-06-11 19:01:53'),
(542, 7, 14, 10000000, 1, 10000000, NULL, 1, '2026-06-11 19:01:53'),
(543, 7, 15, 4000000, 1, 4000000, NULL, 1, '2026-06-11 19:01:53'),
(544, 7, 16, 4000000, 1, 4000000, NULL, 1, '2026-06-11 19:01:53'),
(545, 7, 17, 5000000, 1, 5000000, NULL, 1, '2026-06-11 19:01:53'),
(546, 7, 18, 60000, 1, 60000, NULL, 1, '2026-06-11 19:01:53'),
(547, 7, 19, 2800000, 1, 2800000, NULL, 1, '2026-06-11 19:01:53'),
(548, 7, 20, 20000000, 1, 20000000, NULL, 1, '2026-06-11 19:01:53'),
(549, 7, 21, 40000000, 1, 40000000, NULL, 1, '2026-06-11 19:01:53'),
(550, 7, 22, 40000000, 1, 40000000, NULL, 1, '2026-06-11 19:01:53'),
(551, 7, 23, 100000000, 1, 100000000, NULL, 1, '2026-06-11 19:01:53'),
(552, 7, 24, 100000000, 1, 100000000, NULL, 1, '2026-06-11 19:01:53'),
(553, 7, 25, 100000000, 1, 100000000, NULL, 1, '2026-06-11 19:01:53'),
(554, 7, 26, 100000000, 1, 100000000, NULL, 1, '2026-06-11 19:01:53'),
(555, 7, 27, 100000000, 1, 100000000, NULL, 1, '2026-06-11 19:01:53'),
(556, 7, 28, 20000000, 1, 20000000, NULL, 1, '2026-06-11 19:01:53'),
(557, 7, 29, 20000000, 1, 20000000, NULL, 1, '2026-06-11 19:01:53'),
(558, 7, 30, 20000000, 1, 20000000, NULL, 1, '2026-06-11 19:01:53'),
(559, 7, 31, 3600000, 1, 3600000, NULL, 1, '2026-06-11 19:01:53'),
(560, 7, 32, 12000000, 1, 12000000, NULL, 1, '2026-06-11 19:01:53'),
(561, 7, 33, 32000000, 1, 32000000, NULL, 1, '2026-06-11 19:01:53'),
(581, 7, 2132, 3000000, 1, 3000000, NULL, 1, '2026-06-11 19:01:53');

-- --------------------------------------------------------

--
-- Structure de la table `auction_rounds`
--

CREATE TABLE `auction_rounds` (
  `id` int(11) NOT NULL,
  `round_key` varchar(32) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `daily_round` tinyint(4) NOT NULL DEFAULT 1,
  `status` varchar(16) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `closed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `auction_rounds`
--

INSERT INTO `auction_rounds` (`id`, `round_key`, `starts_at`, `ends_at`, `daily_round`, `status`, `created_at`, `closed_at`) VALUES
(1, '20260425-1', '2026-04-25 12:00:00', '2026-04-25 13:00:00', 1, 'closed', '2026-04-25 12:01:42', '2026-04-25 13:01:42'),
(2, '20260425-2', '2026-04-25 18:00:00', '2026-04-25 19:00:00', 2, 'closed', '2026-04-25 18:18:07', '2026-04-26 18:11:34'),
(3, '20260426-2', '2026-04-26 18:00:00', '2026-04-26 19:00:00', 2, 'closed', '2026-04-26 18:11:34', '2026-04-26 19:01:49'),
(4, '20260426-3', '2026-04-26 22:00:00', '2026-04-26 23:00:00', 3, 'closed', '2026-04-26 22:01:50', '2026-04-27 01:43:29'),
(5, '20260428-1', '2026-04-28 12:00:00', '2026-04-28 13:00:00', 1, 'closed', '2026-04-28 12:21:31', '2026-05-08 04:14:36'),
(6, '20260523-1', '2026-05-23 12:00:00', '2026-05-23 13:00:00', 1, 'closed', '2026-05-23 12:33:57', '2026-05-23 21:27:36'),
(7, '20260611-2', '2026-06-11 18:00:00', '2026-06-11 19:00:00', 2, 'closed', '2026-06-11 18:01:53', '2026-06-11 19:01:53');

-- --------------------------------------------------------

--
-- Structure de la table `auction_wins`
--

CREATE TABLE `auction_wins` (
  `id` bigint(20) NOT NULL,
  `round_id` int(11) NOT NULL,
  `lot_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `auction_item_id` int(11) NOT NULL,
  `final_bid_credits` bigint(20) NOT NULL,
  `grant_status` varchar(16) NOT NULL DEFAULT 'pending',
  `error_message` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `granted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `auction_wins`
--

INSERT INTO `auction_wins` (`id`, `round_id`, `lot_id`, `player_id`, `auction_item_id`, `final_bid_credits`, `grant_status`, `error_message`, `created_at`, `granted_at`) VALUES
(1, 2, 41, 1, 8, 1200001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(2, 2, 48, 1, 15, 4000001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(3, 2, 49, 1, 16, 4000001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(4, 2, 50, 1, 17, 5000001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(5, 2, 51, 1, 18, 60001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(6, 2, 61, 1, 28, 20000001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34'),
(7, 2, 62, 1, 29, 20000001, 'granted', NULL, '2026-04-26 18:11:34', '2026-04-26 18:11:34');

-- --------------------------------------------------------

--
-- Structure de la table `bans`
--

CREATE TABLE `bans` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) NOT NULL DEFAULT 0,
  `remote_address` varchar(64) NOT NULL DEFAULT '',
  `timestamp_created` double NOT NULL DEFAULT 0,
  `timestamp_expire` double NOT NULL DEFAULT 0,
  `moderator_id` int(10) NOT NULL DEFAULT 0,
  `reason_text` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `chatrooms`
--

CREATE TABLE `chatrooms` (
  `Index` int(11) NOT NULL,
  `Name` text NOT NULL,
  `Id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `chatrooms`
--

INSERT INTO `chatrooms` (`Index`, `Name`, `Id`) VALUES
(0, 'Global', 250),
(1, 'English', 251);

-- --------------------------------------------------------

--
-- Structure de la table `chat_bans`
--

CREATE TABLE `chat_bans` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) NOT NULL DEFAULT 0,
  `remote_address` varchar(64) NOT NULL DEFAULT '',
  `timestamp_created` double NOT NULL DEFAULT 0,
  `timestamp_expire` double NOT NULL DEFAULT 0,
  `moderator_id` int(10) NOT NULL DEFAULT 0,
  `reason_text` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `chat_channel`
--

CREATE TABLE `chat_channel` (
  `id` int(11) NOT NULL,
  `channel_id` int(11) NOT NULL,
  `channel_name` varchar(255) NOT NULL,
  `company_id` int(11) NOT NULL DEFAULT -1,
  `player_in_channel` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `chat_channel`
--

INSERT INTO `chat_channel` (`id`, `channel_id`, `channel_name`, `company_id`, `player_in_channel`) VALUES
(1, 1, 'Global', -1, 0);

-- --------------------------------------------------------

--
-- Structure de la table `chat_whispers`
--

CREATE TABLE `chat_whispers` (
  `id` int(11) NOT NULL,
  `id_whisper` int(11) NOT NULL,
  `message` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `id_whispered` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan`
--

CREATE TABLE `clan` (
  `id` int(11) NOT NULL,
  `clan_company` int(10) NOT NULL DEFAULT 1,
  `clan_tag` varchar(255) NOT NULL,
  `clan_name` varchar(255) NOT NULL,
  `clan_description` varchar(255) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `kill_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_diplomacy`
--

CREATE TABLE `clan_diplomacy` (
  `id` int(11) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `second_clan_id` int(11) NOT NULL,
  `type` enum('war','alliance','nap') NOT NULL,
  `message` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_diplomacy_request`
--

CREATE TABLE `clan_diplomacy_request` (
  `id` int(11) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `second_clan_id` int(11) NOT NULL,
  `type` enum('war','alliance','nap','war_cancel') NOT NULL DEFAULT 'war',
  `message` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_log`
--

CREATE TABLE `clan_log` (
  `id` bigint(20) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `action_type` varchar(32) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_messages`
--

CREATE TABLE `clan_messages` (
  `id` int(64) NOT NULL,
  `clanid` int(64) NOT NULL,
  `player_id` int(64) NOT NULL,
  `message` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_request`
--

CREATE TABLE `clan_request` (
  `id` int(11) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `message` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_rights`
--

CREATE TABLE `clan_rights` (
  `rights_id` int(11) NOT NULL,
  `rights_name` varchar(50) NOT NULL,
  `rights_str` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `clan_rights`
--

INSERT INTO `clan_rights` (`rights_id`, `rights_name`, `rights_str`) VALUES
(1, 'Diplomacy Manager', 'diplomacy'),
(2, 'Roles Manager', 'role'),
(3, 'Kick Player', 'kick'),
(4, 'Request Manager', 'request');

-- --------------------------------------------------------

--
-- Structure de la table `clan_roles`
--

CREATE TABLE `clan_roles` (
  `clan_id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) UNSIGNED NOT NULL,
  `role` varchar(32) NOT NULL DEFAULT 'member',
  `role_name` varchar(9) NOT NULL DEFAULT 'member',
  `can_invite` tinyint(1) NOT NULL DEFAULT 0,
  `can_kick` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit_desc` tinyint(1) NOT NULL DEFAULT 0,
  `can_set_tax` tinyint(1) NOT NULL DEFAULT 0,
  `can_spend` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `can_review_requests` tinyint(1) NOT NULL DEFAULT 0,
  `can_manage_roles` tinyint(1) NOT NULL DEFAULT 0,
  `can_set_tax_rate` tinyint(1) NOT NULL DEFAULT 0,
  `can_toggle_tax_active` tinyint(1) NOT NULL DEFAULT 0,
  `can_start_alliance` tinyint(1) NOT NULL DEFAULT 0,
  `can_cancel_alliance` tinyint(1) NOT NULL DEFAULT 0,
  `can_declare_war` tinyint(1) NOT NULL DEFAULT 0,
  `can_request_war_cancel` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_tax_ledger`
--

CREATE TABLE `clan_tax_ledger` (
  `id` bigint(20) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `run_date` date NOT NULL,
  `rate_bps` smallint(5) UNSIGNED NOT NULL,
  `base_amount` bigint(20) UNSIGNED NOT NULL,
  `tax_amount` bigint(20) UNSIGNED NOT NULL,
  `status` enum('success','skipped','failed') NOT NULL DEFAULT 'success',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_tax_settings`
--

CREATE TABLE `clan_tax_settings` (
  `clan_id` int(11) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 0,
  `rate_bps` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `last_run_date` date DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_transfers`
--

CREATE TABLE `clan_transfers` (
  `id` bigint(20) NOT NULL,
  `clan_id` int(11) NOT NULL,
  `actor_user_id` int(11) NOT NULL,
  `to_user_id` int(11) NOT NULL,
  `amount` bigint(20) UNSIGNED NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clan_wallet`
--

CREATE TABLE `clan_wallet` (
  `clan_id` int(11) NOT NULL,
  `balance` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `coupon`
--

CREATE TABLE `coupon` (
  `id` int(11) NOT NULL,
  `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `uridiums` int(11) NOT NULL,
  `credits` int(11) NOT NULL,
  `tokens` int(11) NOT NULL,
  `tickets` int(11) NOT NULL,
  `promerium` int(11) NOT NULL,
  `freeNames` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

--
-- Déchargement des données de la table `coupon`
--

INSERT INTO `coupon` (`id`, `name`, `uridiums`, `credits`, `tokens`, `tickets`, `promerium`, `freeNames`) VALUES
(2, 'AUTUMN2018', 300000, 500000000, 1, 5, 0, 1);

-- --------------------------------------------------------

--
-- Structure de la table `drone`
--

CREATE TABLE `drone` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `level` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `drone`
--

INSERT INTO `drone` (`id`, `player_id`, `item_id`, `name`, `level`) VALUES
(1, 1, 3, 'Iris 1', 6),
(2, 1, 3, 'Iris 2', 6),
(3, 1, 3, 'Iris 3', 6),
(4, 1, 3, 'Iris 4', 6),
(5, 1, 3, 'Iris 5', 6),
(6, 1, 3, 'Iris 6', 6),
(7, 1, 3, 'Iris 7', 6);

-- --------------------------------------------------------

--
-- Structure de la table `drone_config_slot`
--

CREATE TABLE `drone_config_slot` (
  `player_id` int(11) NOT NULL,
  `config` char(1) NOT NULL,
  `drone_index` int(11) NOT NULL,
  `slot_index` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `drone_design_equipped`
--

CREATE TABLE `drone_design_equipped` (
  `drone_id` int(11) NOT NULL,
  `design_item_id` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `drone_design_equipped`
--

INSERT INTO `drone_design_equipped` (`drone_id`, `design_item_id`, `updated_at`) VALUES
(1, 9001, '2026-06-12 10:25:01'),
(2, 9001, '2026-06-12 10:25:01'),
(3, 9001, '2026-06-12 10:25:01'),
(4, 9001, '2026-06-12 10:25:01'),
(5, 9001, '2026-06-12 10:25:01'),
(6, 9001, '2026-06-12 10:25:01'),
(7, 9001, '2026-06-12 10:25:01');

-- --------------------------------------------------------

--
-- Structure de la table `drone_slot`
--

CREATE TABLE `drone_slot` (
  `id` int(11) NOT NULL,
  `drone_id` int(11) NOT NULL,
  `slot_index` tinyint(4) NOT NULL,
  `item_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `drone_slot`
--

INSERT INTO `drone_slot` (`id`, `drone_id`, `slot_index`, `item_id`) VALUES
(1, 1, 0, 2),
(2, 1, 1, 2),
(3, 2, 0, 1),
(4, 2, 1, 1),
(5, 3, 0, 1),
(6, 3, 1, 1),
(7, 4, 0, 1),
(8, 4, 1, 1),
(9, 5, 0, 1),
(10, 5, 1, 1),
(11, 6, 0, 1),
(12, 6, 1, 1),
(13, 7, 0, 1),
(14, 7, 1, 1);

-- --------------------------------------------------------

--
-- Structure de la table `drone_slot_config`
--

CREATE TABLE `drone_slot_config` (
  `drone_id` int(11) NOT NULL,
  `config` char(1) NOT NULL,
  `slot_index` tinyint(4) NOT NULL,
  `item_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `drone_slot_config`
--

INSERT INTO `drone_slot_config` (`drone_id`, `config`, `slot_index`, `item_id`) VALUES
(1, 'A', 0, 2),
(1, 'A', 1, 2),
(1, 'B', 0, 2),
(1, 'B', 1, 2),
(2, 'A', 0, 2),
(2, 'A', 1, 2),
(2, 'B', 0, 1),
(2, 'B', 1, 1),
(3, 'A', 0, 1),
(3, 'A', 1, 1),
(3, 'B', 0, 1),
(3, 'B', 1, 1),
(4, 'A', 0, 1),
(4, 'A', 1, 1),
(4, 'B', 0, 1),
(4, 'B', 1, 1),
(5, 'A', 0, 1),
(5, 'A', 1, 1),
(5, 'B', 0, 1),
(5, 'B', 1, 1),
(6, 'A', 0, 1),
(6, 'A', 1, 1),
(6, 'B', 0, 1),
(6, 'B', 1, 1),
(7, 'A', 0, 2),
(7, 'A', 1, 2),
(7, 'B', 0, 1),
(7, 'B', 1, 1);

-- --------------------------------------------------------

--
-- Structure de la table `event_information`
--

CREATE TABLE `event_information` (
  `id` int(11) NOT NULL,
  `libelle` varchar(50) NOT NULL,
  `isActif` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `playerId` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `event_information`
--

INSERT INTO `event_information` (`id`, `libelle`, `isActif`, `type`, `playerId`) VALUES
(1, 'Invasion', 0, 'event', 0),
(2, 'Survivor', 0, 'event', 0),
(3, 'Spaceball', 0, 'event', 0),
(4, 'Happy hour', 0, 'event', 0),
(5, 'Winner of Survivor', 0, 'winner_survivor', 0);

-- --------------------------------------------------------

--
-- Structure de la table `invite_code`
--

CREATE TABLE `invite_code` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `items`
--

CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `name` varchar(20) NOT NULL,
  `type` int(11) NOT NULL,
  `category` varchar(20) NOT NULL,
  `selling_credits` int(11) NOT NULL,
  `cdn_30x30` varchar(32) NOT NULL,
  `cdn_63x63` varchar(32) NOT NULL,
  `cdn_100x100` varchar(32) NOT NULL,
  `lootIds` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `items`
--

INSERT INTO `items` (`id`, `name`, `type`, `category`, `selling_credits`, `cdn_30x30`, `cdn_63x63`, `cdn_100x100`, `lootIds`) VALUES
(1, 'LF-3', 0, 'laser', 30000, 'dc3f2118a4fae31b28744f5f69b53e00', 'b8ec173f11257347acc378cf2b19c300', '5ced49170920715d57158fe1773a4400', 'equipment_weapon_laser_lf-3'),
(2, 'SG3N-B02', 4, 'generator', 30000, '8c0b74bf0cc43c58fb39e6d48c495000', 'd2fc1d2a80f3ef4376c9b63145b10c00', '19228ba81b387583a63ed8c9a9465400', 'equipment_generator_shield_sg3n-b02'),
(3, 'IrisDrone', 23, 'drone', 150000, '0', '0', '0', 'drone_iris'),
(4, 'G3N-7900', 3, 'generator', 5000, 'ea805e03b2d3fa173b723f1f846bc900', '768dea8b4af9ee7381b707cc63f3ac00', '6f332bdc590ad65c8095d1c303cebf00', 'equipment_generator_speed_g3n-7900'),
(5, 'Flax', 23, 'drone', 50000, '0', '0', '0', 'drone_flax'),
(10, 'LF-1', 0, 'laser', 10000, '0', '0', '0', 'equipment_weapon_laser_lf-1'),
(11, 'MP-1', 0, 'laser', 40000, '0', '0', '0', 'equipment_weapon_laser_mp-1'),
(12, 'LF-2', 0, 'laser', 250000, '0', '0', '0', 'equipment_weapon_laser_lf-2'),
(20, 'AutoRocket', 2, 'extra', 15000, '0', '0', '0', 'equipment_extra_cpu_arol-x'),
(21, 'CargoExp', 2, 'extra', 15000, '0', '0', '0', 'equipment_extra_cpu_hm7'),
(30, 'G3N-1010', 3, 'generator', 2000, '0', '0', '0', 'equipment_generator_speed_g3n-1010'),
(31, 'G3N-2010', 3, 'generator', 4000, '0', '0', '0', 'equipment_generator_speed_g3n-2010'),
(32, 'G3N-3210', 3, 'generator', 8000, '0', '0', '0', 'equipment_generator_speed_g3n-3210'),
(33, 'G3N-3310', 3, 'generator', 16000, '0', '0', '0', 'equipment_generator_speed_g3n-3310'),
(34, 'G3N-6900', 3, 'generator', 32000, '0', '0', '0', 'equipment_generator_speed_g3n-6900'),
(35, 'SG3N-A01', 4, 'generator', 8000, '0', '0', '0', 'equipment_generator_shield_sg3n-a01'),
(36, 'SG3N-A02', 4, 'generator', 24000, '0', '0', '0', 'equipment_generator_shield_sg3n-a02'),
(37, 'SG3N-B01', 4, 'generator', 256000, '0', '0', '0', 'equipment_generator_shield_sg3n-b01'),
(38, 'HST-1', 2, 'extra', 500000, '0', '0', '0', 'equipment_extra_rocketlauncher_hst-1'),
(39, 'HST-2', 2, 'extra', 0, '0', '0', '0', 'equipment_extra_rocketlauncher_hst-2'),
(9001, 'Havok Drone Design', 1, 'extra', 50000, '', '', '', '');

-- --------------------------------------------------------

--
-- Structure de la table `lottery_logs`
--

CREATE TABLE `lottery_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `reward_value` varchar(100) DEFAULT NULL,
  `tickets_left` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `maps`
--

CREATE TABLE `maps` (
  `id` int(11) NOT NULL,
  `name` varchar(5) NOT NULL,
  `player_on_map` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `maps`
--

INSERT INTO `maps` (`id`, `name`, `player_on_map`) VALUES
(0, '', 0),
(1, '1-1', 0),
(2, '1-2', 0),
(3, '1-3', 0),
(4, '1-4', 0),
(5, '2-1', 0),
(6, '2-2', 0),
(7, '2-3', 0),
(8, '2-4', 0),
(9, '3-1', 0),
(10, '3-2', 0),
(11, '3-3', 0),
(12, '3-4', 0),
(13, '4-1', 0),
(14, '4-2', 0),
(15, '4-3', 0),
(16, '4-4', 0),
(17, '1-5', 0),
(18, '1-6', 0),
(19, '1-7', 0),
(20, '1-8', 0),
(21, '2-5', 0),
(22, '2-6', 0),
(23, '2-7', 0),
(24, '2-8', 0),
(25, '3-5', 0),
(26, '3-6', 0),
(27, '3-7', 0),
(28, '3-8', 0),
(29, '4-5', 0),
(51, 'GGA', 0),
(52, 'GGB', 0),
(53, 'GGG', 0),
(55, 'GGD', 0),
(80, 'Surv', 0),
(81, 'Inva', 0);

-- --------------------------------------------------------

--
-- Structure de la table `moderation_action_log`
--

CREATE TABLE `moderation_action_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `moderator_id` int(10) UNSIGNED NOT NULL,
  `moderator_name` varchar(16) NOT NULL,
  `action_descr` varchar(255) NOT NULL,
  `action_detail` text NOT NULL,
  `timestamp` double NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `name_change`
--

CREATE TABLE `name_change` (
  `id` int(11) NOT NULL,
  `playerid` int(11) NOT NULL,
  `previousName` varchar(200) NOT NULL,
  `actualName` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `paypal_payment`
--

CREATE TABLE `paypal_payment` (
  `playerid` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `player_cargo`
--

CREATE TABLE `player_cargo` (
  `id` int(64) NOT NULL,
  `prometium` int(64) NOT NULL DEFAULT 0,
  `endurium` int(64) NOT NULL DEFAULT 0,
  `terbium` int(64) NOT NULL DEFAULT 0,
  `xenomit` int(64) NOT NULL DEFAULT 0,
  `prometid` int(64) NOT NULL DEFAULT 0,
  `duranium` int(64) NOT NULL DEFAULT 0,
  `promerium` int(64) NOT NULL DEFAULT 0,
  `palladium` int(64) NOT NULL DEFAULT 0,
  `seprom` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `player_cargo`
--

INSERT INTO `player_cargo` (`id`, `prometium`, `endurium`, `terbium`, `xenomit`, `prometid`, `duranium`, `promerium`, `palladium`, `seprom`) VALUES
(1, 198, 1, 0, 16546, 19, 7, 7, 0, 0),
(2, 78, 0, 0, 2, 2, 0, 0, 0, 0),
(3, 30, 37, 0, 0, 2, 0, 0, 0, 0),
(4, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `player_config`
--

CREATE TABLE `player_config` (
  `player_id` int(32) NOT NULL,
  `damage1` int(11) NOT NULL DEFAULT 5,
  `shield1` int(11) NOT NULL DEFAULT 5,
  `speed1` int(11) NOT NULL DEFAULT 5,
  `damage2` int(11) NOT NULL DEFAULT 5,
  `shield2` int(11) NOT NULL DEFAULT 5,
  `speed2` int(11) NOT NULL DEFAULT 5
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `player_config`
--

INSERT INTO `player_config` (`player_id`, `damage1`, `shield1`, `speed1`, `damage2`, `shield2`, `speed2`) VALUES
(1, 2868, 60000, 480, 3552, 120000, 380),
(2, 5, 5, 5, 5, 5, 5),
(3, 5, 5, 5, 5, 5, 5),
(4, 5, 5, 5, 5, 5, 5);

-- --------------------------------------------------------

--
-- Structure de la table `player_coupon`
--

CREATE TABLE `player_coupon` (
  `playerId` int(11) NOT NULL,
  `couponId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `player_designs`
--

CREATE TABLE `player_designs` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `design_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_designs`
--

INSERT INTO `player_designs` (`id`, `player_id`, `design_id`) VALUES
(3, 1, 18),
(2, 1, 66),
(1, 1, 67);

-- --------------------------------------------------------

--
-- Structure de la table `player_galaxy_gates`
--

CREATE TABLE `player_galaxy_gates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `gate_id` tinyint(4) NOT NULL COMMENT '1=Alpha, 2=Beta, 3=Gamma, 4=Delta',
  `parts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parts`)),
  `on_map` tinyint(1) NOT NULL DEFAULT 0,
  `completed` tinyint(1) DEFAULT 0,
  `lives` int(11) DEFAULT 3,
  `current_wave` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `player_galaxy_gates`
--

INSERT INTO `player_galaxy_gates` (`id`, `user_id`, `gate_id`, `parts`, `on_map`, `completed`, `lives`, `current_wave`) VALUES
(1, 1, 4, '[]', 1, 0, 3, 6),
(2, 1, 1, '[]', 1, 0, 3, 1),
(3, 1, 2, '[]', 1, 0, 1, 6),
(4, 1, 3, '[]', 1, 0, 3, 1);

-- --------------------------------------------------------

--
-- Structure de la table `player_inventory`
--

CREATE TABLE `player_inventory` (
  `player_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_inventory`
--

INSERT INTO `player_inventory` (`player_id`, `item_id`, `qty`) VALUES
(1, 1, 30),
(1, 2, 19),
(1, 3, 7),
(1, 4, 15),
(1, 20, 1),
(1, 21, 1),
(1, 39, 1),
(1, 9001, 8),
(4, 3, 8);

-- --------------------------------------------------------

--
-- Structure de la table `player_reff`
--

CREATE TABLE `player_reff` (
  `id` int(64) NOT NULL,
  `laser0` int(64) NOT NULL DEFAULT 0,
  `laser1` int(64) NOT NULL DEFAULT 0,
  `rocket0` int(64) NOT NULL DEFAULT 0,
  `rocket1` int(64) NOT NULL DEFAULT 0,
  `speed0` int(64) NOT NULL DEFAULT 0,
  `speed1` int(64) NOT NULL DEFAULT 0,
  `shield0` int(64) NOT NULL DEFAULT 0,
  `shield1` int(64) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `player_reff`
--

INSERT INTO `player_reff` (`id`, `laser0`, `laser1`, `rocket0`, `rocket1`, `speed0`, `speed1`, `shield0`, `shield1`) VALUES
(1, 14, 95812, 14, 4453, 13, 1783415926, 13, 1795887288),
(2, 0, 0, 0, 0, 0, 0, 0, 0),
(3, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `player_role`
--

CREATE TABLE `player_role` (
  `player_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `player_seprom_safe`
--

CREATE TABLE `player_seprom_safe` (
  `player_id` int(11) NOT NULL,
  `safe_level` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `stored_seprom` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_seprom_safe`
--

INSERT INTO `player_seprom_safe` (`player_id`, `safe_level`, `stored_seprom`) VALUES
(1, 0, 0),
(2, 0, 0),
(3, 0, 0),
(4, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `player_ship_designs`
--

CREATE TABLE `player_ship_designs` (
  `player_id` int(11) NOT NULL,
  `design_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `player_titles`
--

CREATE TABLE `player_titles` (
  `player_id` int(11) NOT NULL,
  `title_key` varchar(32) NOT NULL,
  `title_scope` enum('permanent','temporary') NOT NULL DEFAULT 'permanent',
  `source` varchar(64) NOT NULL DEFAULT '',
  `unlocked_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_titles`
--

INSERT INTO `player_titles` (`player_id`, `title_key`, `title_scope`, `source`, `unlocked_at`, `expires_at`, `revoked_at`) VALUES
(1, 'title_402', 'permanent', 'map_29_boss_cubikon_kills', '2026-06-09 01:13:42', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `player_title_progress`
--

CREATE TABLE `player_title_progress` (
  `player_id` int(11) NOT NULL,
  `progress_key` varchar(64) NOT NULL,
  `current_amount` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_title_progress`
--

INSERT INTO `player_title_progress` (`player_id`, `progress_key`, `current_amount`, `updated_at`) VALUES
(1, 'boss_cubikon_map29', 25, '2026-06-09 01:13:42'),
(1, 'boss_protegit_map29', 20, '2026-06-09 12:39:45'),
(1, 'uber_npc_map29', 76, '2026-06-12 12:27:27');

-- --------------------------------------------------------

--
-- Structure de la table `player_title_selection`
--

CREATE TABLE `player_title_selection` (
  `player_id` int(11) NOT NULL,
  `selected_title_key` varchar(32) NOT NULL DEFAULT '',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `player_title_selection`
--

INSERT INTO `player_title_selection` (`player_id`, `selected_title_key`, `updated_at`) VALUES
(1, 'title_402', '2026-06-09 01:13:42');

-- --------------------------------------------------------

--
-- Structure de la table `portals`
--

CREATE TABLE `portals` (
  `id` int(11) NOT NULL,
  `pos_x` int(11) NOT NULL,
  `pos_y` int(11) NOT NULL,
  `map_id` int(11) NOT NULL,
  `arrive_id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `portals`
--

INSERT INTO `portals` (`id`, `pos_x`, `pos_y`, `map_id`, `arrive_id`, `type`) VALUES
(1, 190, 110, 1, 2, 1),
(2, 20, 20, 2, 1, 1),
(3, 190, 20, 2, 4, 1),
(4, 20, 110, 3, 3, 1),
(5, 190, 110, 2, 6, 1),
(6, 20, 20, 4, 5, 1),
(7, 190, 110, 3, 8, 1),
(8, 190, 20, 4, 7, 1),
(9, 190, 20, 3, 300, 1),
(11, 190, 65, 4, 41, 1),
(12, 20, 65, 13, 11, 1),
(13, 20, 110, 5, 14, 1),
(14, 190, 20, 6, 13, 1),
(16, 190, 110, 7, 20, 1),
(17, 190, 110, 6, 21, 1),
(20, 190, 20, 8, 16, 1),
(21, 20, 20, 8, 17, 1),
(24, 105, 110, 8, 45, 1),
(25, 105, 20, 14, 24, 1),
(26, 20, 20, 9, 27, 1),
(27, 190, 110, 10, 26, 1),
(28, 20, 20, 10, 33, 1),
(29, 190, 20, 10, 35, 1),
(30, 20, 20, 12, 100, 1),
(31, 105, 20, 12, 302, 1),
(32, 190, 20, 12, 34, 1),
(33, 190, 110, 12, 28, 1),
(34, 20, 110, 11, 32, 1),
(35, 190, 110, 11, 29, 1),
(36, 20, 20, 11, 102, 1),
(37, 20, 20, 15, 42, 1),
(38, 190, 65, 15, 31, 1),
(40, 105, 65, 13, 41, 1),
(41, 198, 150, 16, 11, 1),
(42, 190, 110, 14, 37, 1),
(44, 20, 110, 15, 106, 1),
(45, 210, 130, 16, 24, 1),
(46, 40, 130, 16, 52, 1),
(48, 380, 40, 16, 49, 1),
(49, 20, 110, 21, 48, 1),
(50, 380, 220, 16, 51, 1),
(51, 20, 20, 25, 50, 1),
(52, 190, 65, 17, 46, 1),
(53, 20, 110, 18, 57, 1),
(54, 20, 20, 19, 56, 1),
(56, 190, 110, 20, 54, 1),
(57, 190, 20, 20, 53, 1),
(61, 190, 20, 22, 65, 1),
(62, 190, 110, 24, 63, 1),
(63, 190, 20, 23, 62, 1),
(65, 20, 110, 24, 61, 1),
(67, 20, 20, 26, 72, 1),
(71, 20, 20, 28, 406, 1),
(72, 20, 110, 25, 67, 1),
(73, 190, 110, 25, 74, 1),
(74, 20, 110, 27, 73, 1),
(100, 190, 110, 4, 30, 1),
(101, 190, 20, 7, 103, 1),
(102, 20, 110, 8, 36, 1),
(103, 20, 110, 6, 101, 1),
(104, 20, 110, 14, 105, 1),
(105, 190, 20, 13, 104, 1),
(106, 190, 110, 13, 44, 1),
(107, 105, 65, 14, 45, 1),
(300, 20, 110, 7, 9, 1),
(301, 105, 65, 15, 302, 1),
(302, 222, 150, 16, 31, 1),
(303, 20, 20, 17, 304, 1),
(304, 190, 110, 18, 303, 1),
(305, 20, 110, 17, 306, 1),
(306, 190, 20, 19, 305, 1),
(400, 20, 20, 21, 401, 1),
(401, 20, 110, 22, 400, 1),
(402, 190, 20, 21, 403, 1),
(403, 20, 110, 23, 402, 1),
(404, 190, 110, 26, 405, 1),
(405, 20, 110, 28, 404, 1),
(406, 190, 110, 27, 71, 1),
(407, 105, 110, 17, 408, 1),
(408, 40, 131, 29, 407, 1),
(409, 190, 65, 21, 410, 1),
(410, 210, 40, 29, 409, 1),
(411, 190, 20, 25, 412, 1),
(412, 380, 131, 29, 411, 1),
(413, 210, 131, 29, 45, 1);

-- --------------------------------------------------------

--
-- Structure de la table `role_clan`
--

CREATE TABLE `role_clan` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `clan_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `role_rights`
--

CREATE TABLE `role_rights` (
  `rights_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `server_statistics`
--

CREATE TABLE `server_statistics` (
  `skey` varchar(64) NOT NULL,
  `sval` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Déchargement des données de la table `server_statistics`
--

INSERT INTO `server_statistics` (`skey`, `sval`) VALUES
('active_connections', '1'),
('active_EIC', '1'),
('active_MMO', '3'),
('active_VRU', '0');

-- --------------------------------------------------------

--
-- Structure de la table `ship_config`
--

CREATE TABLE `ship_config` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `ship_design_id` int(11) NOT NULL DEFAULT 1,
  `name` enum('A','B') NOT NULL,
  `reactor_cap` int(11) NOT NULL DEFAULT 120,
  `lasers_slots` int(11) NOT NULL DEFAULT 10,
  `gen_slots` int(11) NOT NULL DEFAULT 4,
  `extras_slots` int(11) NOT NULL DEFAULT 6,
  `damage_total` int(11) DEFAULT 0,
  `shield_total` int(11) DEFAULT 0,
  `speed_total` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `ship_config`
--

INSERT INTO `ship_config` (`id`, `player_id`, `ship_design_id`, `name`, `reactor_cap`, `lasers_slots`, `gen_slots`, `extras_slots`, `damage_total`, `shield_total`, `speed_total`) VALUES
(1, 1, 3, 'A', 120, 6, 6, 1, 0, 0, 0),
(2, 1, 3, 'B', 120, 6, 6, 1, 0, 0, 0),
(5, 1, 10, 'A', 120, 15, 15, 3, 0, 0, 0),
(6, 1, 10, 'B', 120, 15, 15, 3, 0, 0, 0),
(11, 1, 67, 'A', 120, 15, 15, 3, 0, 0, 0),
(12, 1, 67, 'B', 120, 15, 15, 3, 0, 0, 0),
(43, 4, 10, 'A', 120, 15, 15, 3, 0, 0, 0),
(44, 4, 10, 'B', 120, 15, 15, 3, 0, 0, 0),
(63, 1, 66, 'A', 120, 15, 15, 3, 0, 0, 0),
(64, 1, 66, 'B', 120, 15, 15, 3, 0, 0, 0),
(85, 1, 56, 'A', 120, 15, 15, 3, 0, 0, 0),
(86, 1, 56, 'B', 120, 15, 15, 3, 0, 0, 0),
(154, 1, 1, 'A', 120, 1, 1, 1, 0, 0, 0),
(155, 1, 1, 'B', 120, 1, 1, 1, 0, 0, 0),
(319, 1, 6, 'A', 120, 6, 8, 2, 0, 0, 0),
(320, 1, 6, 'B', 120, 6, 8, 2, 0, 0, 0),
(357, 3, 1, 'A', 120, 1, 1, 1, 0, 0, 0),
(358, 3, 1, 'B', 120, 1, 1, 1, 0, 0, 0),
(392, 1, 8, 'A', 120, 10, 10, 2, 0, 0, 0),
(393, 1, 8, 'B', 120, 10, 10, 2, 0, 0, 0),
(396, 1, 18, 'A', 120, 10, 10, 2, 0, 0, 0),
(397, 1, 18, 'B', 120, 10, 10, 2, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `ship_config_stats`
--

CREATE TABLE `ship_config_stats` (
  `ship_config_id` int(11) NOT NULL,
  `config` char(1) NOT NULL,
  `lasers_slots` int(11) NOT NULL DEFAULT 0,
  `gen_slots` int(11) NOT NULL DEFAULT 0,
  `extras_slots` int(11) NOT NULL DEFAULT 0,
  `damage_total` int(11) NOT NULL DEFAULT 0,
  `shield_total` int(11) NOT NULL DEFAULT 0,
  `speed_total` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `ship_config_stats`
--

INSERT INTO `ship_config_stats` (`ship_config_id`, `config`, `lasers_slots`, `gen_slots`, `extras_slots`, `damage_total`, `shield_total`, `speed_total`, `updated_at`) VALUES
(5, 'A', 15, 15, 3, 4086, 20000, 450, '2026-05-02 23:48:02'),
(6, 'B', 15, 15, 3, 4392, 150000, 300, '2026-05-02 23:30:19'),
(11, 'A', 15, 15, 3, 0, 0, 300, '2026-06-12 10:23:59'),
(12, 'B', 15, 15, 3, 0, 0, 300, '2026-06-12 10:23:59'),
(63, 'A', 15, 15, 3, 1800, 20000, 300, '2026-04-16 21:46:50'),
(64, 'B', 15, 15, 3, 2100, 0, 300, '2026-04-16 21:46:50'),
(85, 'A', 15, 15, 3, 1800, 50000, 300, '2026-04-17 09:24:23'),
(86, 'B', 15, 15, 3, 2100, 0, 450, '2026-04-17 11:36:18'),
(154, 'A', 1, 1, 1, 0, 0, 320, '2026-05-30 19:35:32'),
(155, 'B', 1, 1, 1, 0, 0, 330, '2026-05-30 19:35:32'),
(396, 'A', 10, 10, 2, 2868, 60000, 480, '2026-06-12 10:24:34'),
(397, 'B', 10, 10, 2, 3552, 120000, 380, '2026-06-12 10:25:01');

-- --------------------------------------------------------

--
-- Structure de la table `ship_design`
--

CREATE TABLE `ship_design` (
  `ship_design_id` int(11) NOT NULL,
  `ship_design_nom` varchar(50) NOT NULL,
  `ship_design_tooltip` varchar(50) NOT NULL,
  `ship_design_uri` int(11) NOT NULL,
  `ship_design_credit` int(11) NOT NULL,
  `ship_design_token` int(11) NOT NULL DEFAULT 0,
  `ship_designs_type` varchar(50) DEFAULT NULL,
  `base_hp_2010` int(11) NOT NULL DEFAULT 0,
  `base_speed_2010` int(11) NOT NULL DEFAULT 0,
  `base_cargo_2010` int(11) NOT NULL DEFAULT 0,
  `laser_slots_2010` int(11) NOT NULL DEFAULT 0,
  `generator_slots_2010` int(11) NOT NULL DEFAULT 0,
  `extra_slots_2010` int(11) NOT NULL DEFAULT 0,
  `bonus_damage_pct` int(11) NOT NULL DEFAULT 0,
  `bonus_shield_pct` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;

--
-- Déchargement des données de la table `ship_design`
--

INSERT INTO `ship_design` (`ship_design_id`, `ship_design_nom`, `ship_design_tooltip`, `ship_design_uri`, `ship_design_credit`, `ship_design_token`, `ship_designs_type`, `base_hp_2010`, `base_speed_2010`, `base_cargo_2010`, `laser_slots_2010`, `generator_slots_2010`, `extra_slots_2010`, `bonus_damage_pct`, `bonus_shield_pct`) VALUES
(1, 'Phoenix', 'Phoenix', 5000000, 2000000000, 0, 'Misc', 4000, 320, 100, 1, 1, 1, 0, 0),
(2, 'Yamato', 'Yamato', 5000000, 2000000000, 0, 'Misc', 64000, 320, 200, 2, 2, 1, 0, 0),
(3, 'Leonov', 'Leonov', 5000000, 2000000000, 0, 'Misc', 64000, 360, 500, 6, 6, 1, 0, 0),
(4, 'Defcom', 'Defcom', 5000000, 2000000000, 0, 'Misc', 32000, 340, 300, 3, 4, 1, 0, 0),
(5, 'Liberator', 'Liberator', 5000000, 2000000000, 0, 'Misc', 16000, 330, 400, 4, 6, 2, 0, 0),
(6, 'Piranha', 'Piranha', 5000000, 2000000000, 0, 'Misc', 64000, 360, 600, 6, 8, 2, 0, 0),
(7, 'Nostromo', 'Nostromo', 5000000, 2000000000, 0, 'Misc', 120000, 340, 700, 7, 10, 3, 0, 0),
(8, 'Vengeance', 'Classic Vengeance', 0, 50000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(9, 'Bigboy', 'Bigboy', 5000000, 2000000000, 0, 'Misc', 160000, 260, 800, 8, 15, 3, 0, 0),
(10, 'Goliath', 'Basic Goliath', 0, 0, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(16, 'Adept Vengeance', 'Adept Vengeance', 700000, 1500000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(17, 'Corsair Vengeance', 'Corsair Vengeance', 700000, 1500000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 5, 0),
(18, 'Lightning', 'Lightning Vengeance', 0, 0, 0, 'Token Designs', 180000, 380, 1500, 10, 10, 2, 5, 0),
(19, 'Jade Goliath', 'Jade Goliath', 1500000, 1500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(22, 'Citadel VRU 3', 'Citadel VRU Elite', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(24, 'Spearhead EIC 2', 'Spearhead EIC Veteran', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(25, 'Spearhead EIC 3', 'Spearhead EIC Elite', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(26, 'Spearhead VRU 2', 'Spearhead VRU Veteran', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(27, 'Spearhead VRU 3', 'Spearhead VRU Elite', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(28, 'Aegis EIC 2', 'Aegis EIC Veteran', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(29, 'Aegis EIC 3', 'Aegis EIC Elite', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(30, 'Aegis VRU 2', 'Aegis VRU Veteran', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(31, 'Aegis VRU 3', 'Aegis VRU Elite', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(32, 'Citadel EIC 3', 'Citadel EIC Elite', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(50, 'Red Bigboy', 'Red Bigboy', 5000000, 2000000000, 0, 'Misc', 0, 0, 0, 0, 0, 0, 0, 0),
(52, 'Orange Goliath', 'Orange Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(53, 'Red Goliath', 'Red Goliath', 200000, 20000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(54, 'Blue Goliath', 'Blue Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(56, 'Enforcer Goliath', 'Enforcer Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 5, 0),
(57, 'USA', 'USA goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(58, 'Revenge', 'Revenge Vengeance', 700000, 1500000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(59, 'Bastion Goliath', 'Bastion Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 10),
(60, 'Avenger', 'Avenge veangeance', 700000, 1500000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(61, 'Veteran Goliath', 'Veteran Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(62, 'Exalted Goliath', 'Exalted Goliath', 1000000, 1000000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(63, 'Solace', 'Solace', 2000000, 2000000000, 0, 'Solaces', 256000, 300, 1500, 15, 15, 3, 0, 10),
(64, 'Diminher', 'Diminsher', 2000000, 2000000000, 0, 'Diminishers', 256000, 300, 1500, 15, 15, 3, 5, 0),
(65, 'Spectrum', 'Spectrum', 2000000, 2000000000, 0, 'Spectrums', 256000, 300, 1500, 15, 15, 3, 0, 25),
(66, 'Sentinel', 'Sentinel', 2000000, 2000000000, 0, 'Sentinels', 256000, 300, 1500, 15, 15, 3, 0, 10),
(67, 'Venom', 'Venom', 2000000, 2000000000, 0, 'Venoms', 256000, 300, 1500, 15, 15, 3, 5, 0),
(68, 'Ignite Goliath', 'Ignite Goliath', 1500000, 1500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(69, 'Red Goliath Bis', 'Red Goliath Bis', 200000, 20000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(86, 'Kick Goliath', 'Kick Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(88, 'Goal goliath', 'Goal goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(116, 'Red Vengeance', 'Red Vengeance', 1000000, 1000000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(117, 'Pusat Vengeance', 'Pusat Vengeance', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(119, 'Referee Goliath', 'Referee Goliath', 1500000, 1500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(120, 'Saphir Goliath', 'Saphir Goliath', 1500000, 1500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(121, 'Amber Goliath', 'Amber Goliath', 1500000, 1500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(122, 'Crimson Goliath', 'Crimson Goliath', 500000, 500000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(123, 'Centaur Goliath', 'Centaur Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(124, 'Saturne Goliath', 'Saturne Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(125, 'Plague Goliath', 'Plague Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(127, 'Yellow Goliath', 'Yellow Goliath', 200000, 100000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(129, 'Blue Vengeance', 'Blue Vengeance', 1000000, 1000000000, 0, 'Vengeances', 180000, 380, 1000, 10, 10, 2, 0, 0),
(130, 'Razer Goliath', 'Razer Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(131, 'Peacemaker Goliath', 'Peacemaker Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(132, 'Sovereign Goliath', 'Sovereign Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(134, 'Vanquisher Goliath', 'Vanquisher Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(136, 'Goliath 2.0', 'Goliath 2.0', 10000, 100000000, 0, 'Goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(137, 'Bronze Goliath', 'Bronze Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(138, 'Iron Goliath', 'Iron Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(139, 'Gold Goliath', 'Gold Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(140, 'Silver Goliath', 'Silver Goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(156, 'Citadel MMO', 'Citadel MMO', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(157, 'Spearhead MMO 2', 'Spearhead MMO Veteran', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(158, 'Aegis', 'Aegis', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(159, 'Citadel EIC 2', 'Citadel EIC Veteran', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(160, 'Citadel VRU 2', 'Citadel VRU Veteran', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(161, 'Spearhead EIC', 'Spearhead EIC', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(162, 'Spearhead VRU', 'Spearhead VRU', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(163, 'Aegis MMO', 'Aegis MMO', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(164, 'Aegis EIC', 'Aegis EIC', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(165, 'Aegis VRU', 'Aegis VRU', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(166, 'Citadel', 'Citadel', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(167, 'Spearhead', 'Spearhead', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(168, 'Citadel MMO 2', 'Citadel MMO Veteran', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(169, 'Citadel MMO 3', 'Citadel MMO Elite', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(170, 'Citadel EIC', 'Citadel EIC', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(172, 'Citadel VRU', 'Citadel VRU', 1500000, 1500000000, 0, 'Citadels', 0, 0, 0, 0, 0, 0, 0, 0),
(174, 'Spearhead MMO', 'Spearhead MMO', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(180, 'Aegis MMO 2', 'Aegis EIC Veteran', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(182, 'Aegis MMO 3', 'Aegis MMO Elite', 1500000, 1500000000, 0, 'Aegis', 0, 0, 0, 0, 0, 0, 0, 0),
(187, 'Green Bigboy', 'Green Bigboy', 5000000, 2000000000, 0, 'Misc', 0, 0, 0, 0, 0, 0, 0, 0),
(188, 'Red Bigboy 2', 'Red Bigboy 2', 5000000, 2000000000, 0, 'Misc', 0, 0, 0, 0, 0, 0, 0, 0),
(189, 'Blue Bigboy', 'Blue Bigboy', 5000000, 2000000000, 0, 'Misc', 0, 0, 0, 0, 0, 0, 0, 0),
(190, 'Solem Bigboy', 'Solem Bigboy', 5000000, 2000000000, 0, 'Misc', 0, 0, 0, 0, 0, 0, 0, 0),
(191, 'France', 'France goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(192, 'Spearhead MMO 3', 'Spearhead MMO Elite', 1500000, 1500000000, 0, 'Spearheads', 0, 0, 0, 0, 0, 0, 0, 0),
(193, 'Poland', 'Poland goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(194, 'Turkey', 'Turkey goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(195, 'Germany', 'Germany goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(196, 'Switzerland', 'Switzerland goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(197, 'Spain', 'Spain goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(198, 'Albania', 'Albania goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(199, 'Austria', 'Austria goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(200, 'Belgium', 'Belgium goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(201, 'Italy', 'Italy goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(202, 'Romania', 'Romania goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(203, 'Russia', 'Russia goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(204, 'Czech republic', 'Czech republic goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(205, 'England', 'England goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(206, 'Portugal', 'Portugal goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(207, 'Slovakia', 'Slovakia goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(208, 'Hungary', 'Hungary goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(209, 'Cyborg', 'Starscream', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(210, 'Cyborg', 'Infinite', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(211, 'Cyborg', 'Scourge', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(212, 'Cyborg', 'Carbonite', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(213, 'Cyborg', 'Celestial', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(214, 'Cyborg', 'Firestar', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(215, 'Cyborg', 'Maelstorm', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(216, 'Cyborg', 'Sunstorm', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(217, 'Cyborg', 'Lava', 0, 0, 3, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(218, 'Cyborg', 'Basic', 2000000, 2000000000, 0, 'Cyborgs', 0, 0, 0, 0, 0, 0, 0, 0),
(219, 'Croatia', 'Croatia goliath', 0, 0, 5, 'Country goliaths', 256000, 300, 1500, 15, 15, 3, 0, 0),
(220, 'Goliath', 'Frost goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(221, 'Goliath', 'Lava goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(222, 'Goliath', 'Argon goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(223, 'Goliath', 'Dusklight goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(224, 'Goliath', 'Legend goliath', 0, 0, 3, 'Token Designs', 0, 0, 0, 0, 0, 0, 0, 0),
(226, 'Solace', 'Ocean', 2000000, 2000000000, 0, 'Solaces', 0, 0, 0, 0, 0, 0, 0, 0),
(227, 'Solace', 'Borealis', 2000000, 2000000000, 0, 'Solaces', 0, 0, 0, 0, 0, 0, 0, 0),
(228, 'Solace', 'Argon', 2000000, 2000000000, 0, 'Solaces', 0, 0, 0, 0, 0, 0, 0, 0),
(229, 'Solace', 'Poison', 2000000, 2000000000, 0, 'Solaces', 0, 0, 0, 0, 0, 0, 0, 0),
(230, 'Solace', 'Blaze', 2000000, 2000000000, 0, 'Solaces', 0, 0, 0, 0, 0, 0, 0, 0),
(231, 'Sentinel', 'Argon', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(232, 'Sentinel', 'Inferno', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(233, 'Sentinel', 'Lava', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(234, 'Sentinel', 'Legend', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(235, 'Sentinel', 'Frost', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(236, 'Sentinel', 'Violet', 2000000, 2000000000, 0, 'Sentinels', 0, 0, 0, 0, 0, 0, 0, 0),
(237, 'Dminisher', 'Argon', 2000000, 2000000000, 0, 'Diminishers', 0, 0, 0, 0, 0, 0, 0, 0),
(238, 'Diminisher', 'Lava', 2000000, 2000000000, 0, 'Diminishers', 0, 0, 0, 0, 0, 0, 0, 0),
(239, 'Diminisher', 'Legend', 2000000, 2000000000, 0, 'Diminishers', 0, 0, 0, 0, 0, 0, 0, 0),
(240, 'Diminisher', 'Violet', 2000000, 2000000000, 0, 'Diminishers', 0, 0, 0, 0, 0, 0, 0, 0),
(241, 'Spectrum', 'Blaze', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(242, 'Spectrum', 'Inferno', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(243, 'Spectrum', 'Frost', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(244, 'Spectrum', 'Lava', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(245, 'Spectrum', 'Legend', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(246, 'Spectrum', 'Ocean', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(247, 'Spectrum', 'Poison', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(248, 'Spectrum', 'Sandstorm', 2000000, 2000000000, 0, 'Spectrums', 0, 0, 0, 0, 0, 0, 0, 0),
(249, 'Venom', 'Argon', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(250, 'Venom', 'Borealis', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(251, 'Venom', 'Inferno', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(252, 'Venom', 'Ocean', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(253, 'Venom', 'Poison', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(254, 'Venom', 'Blaze', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0),
(255, 'Venom', 'Frost', 2000000, 2000000000, 0, 'Venoms', 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `ship_slot`
--

CREATE TABLE `ship_slot` (
  `id` int(11) NOT NULL,
  `ship_config_id` int(11) NOT NULL,
  `row_name` enum('lasers','generators','extras') NOT NULL,
  `slot_index` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `ship_slot`
--

INSERT INTO `ship_slot` (`id`, `ship_config_id`, `row_name`, `slot_index`, `item_id`) VALUES
(1, 1, 'lasers', 0, NULL),
(2, 1, 'lasers', 1, NULL),
(3, 1, 'lasers', 2, NULL),
(4, 1, 'lasers', 3, NULL),
(5, 1, 'lasers', 4, NULL),
(6, 1, 'lasers', 5, NULL),
(7, 1, 'generators', 0, NULL),
(8, 1, 'generators', 1, NULL),
(9, 1, 'generators', 2, NULL),
(10, 1, 'generators', 3, NULL),
(11, 1, 'generators', 4, NULL),
(12, 1, 'generators', 5, NULL),
(13, 1, 'extras', 0, NULL),
(14, 1, 'extras', 1, NULL),
(15, 2, 'lasers', 0, NULL),
(16, 2, 'lasers', 1, NULL),
(17, 2, 'lasers', 2, NULL),
(18, 2, 'lasers', 3, NULL),
(19, 2, 'lasers', 4, NULL),
(20, 2, 'lasers', 5, NULL),
(21, 2, 'generators', 0, NULL),
(22, 2, 'generators', 1, NULL),
(23, 2, 'generators', 2, NULL),
(24, 2, 'generators', 3, NULL),
(25, 2, 'generators', 4, NULL),
(26, 2, 'generators', 5, NULL),
(27, 2, 'extras', 0, NULL),
(28, 2, 'extras', 1, NULL),
(55, 5, 'lasers', 0, 1),
(56, 5, 'lasers', 1, 1),
(57, 5, 'lasers', 2, 1),
(58, 5, 'lasers', 3, 1),
(59, 5, 'lasers', 4, 1),
(60, 5, 'lasers', 5, 1),
(61, 5, 'lasers', 6, 1),
(62, 5, 'lasers', 7, 1),
(63, 5, 'lasers', 8, 1),
(64, 5, 'lasers', 9, 1),
(65, 5, 'lasers', 10, 1),
(66, 5, 'lasers', 11, 1),
(67, 5, 'lasers', 12, 1),
(68, 5, 'lasers', 13, 1),
(69, 5, 'lasers', 14, 1),
(70, 5, 'generators', 0, 4),
(71, 5, 'generators', 1, 4),
(72, 5, 'generators', 2, 4),
(73, 5, 'generators', 3, 4),
(74, 5, 'generators', 4, 4),
(75, 5, 'generators', 5, 4),
(76, 5, 'generators', 6, 4),
(77, 5, 'generators', 7, 4),
(78, 5, 'generators', 8, 4),
(79, 5, 'generators', 9, 4),
(80, 5, 'generators', 10, 4),
(81, 5, 'generators', 11, 4),
(82, 5, 'generators', 12, 4),
(83, 5, 'generators', 13, 4),
(84, 5, 'generators', 14, 4),
(85, 5, 'extras', 0, 21),
(86, 5, 'extras', 1, 39),
(87, 5, 'extras', 2, 20),
(88, 6, 'lasers', 0, 1),
(89, 6, 'lasers', 1, 1),
(90, 6, 'lasers', 2, 1),
(91, 6, 'lasers', 3, 1),
(92, 6, 'lasers', 4, 1),
(93, 6, 'lasers', 5, 1),
(94, 6, 'lasers', 6, 1),
(95, 6, 'lasers', 7, 1),
(96, 6, 'lasers', 8, 1),
(97, 6, 'lasers', 9, 1),
(98, 6, 'lasers', 10, 1),
(99, 6, 'lasers', 11, 1),
(100, 6, 'lasers', 12, 1),
(101, 6, 'lasers', 13, 1),
(102, 6, 'lasers', 14, 1),
(103, 6, 'generators', 0, 2),
(104, 6, 'generators', 1, 2),
(105, 6, 'generators', 2, 2),
(106, 6, 'generators', 3, 2),
(107, 6, 'generators', 4, 2),
(108, 6, 'generators', 5, 2),
(109, 6, 'generators', 6, 2),
(110, 6, 'generators', 7, 2),
(111, 6, 'generators', 8, 2),
(112, 6, 'generators', 9, 2),
(113, 6, 'generators', 10, 2),
(114, 6, 'generators', 11, 2),
(115, 6, 'generators', 12, 2),
(116, 6, 'generators', 13, 2),
(117, 6, 'generators', 14, 2),
(118, 6, 'extras', 0, 20),
(119, 6, 'extras', 1, 21),
(120, 6, 'extras', 2, 39),
(253, 11, 'lasers', 0, NULL),
(254, 11, 'lasers', 1, NULL),
(255, 11, 'lasers', 2, NULL),
(256, 11, 'lasers', 3, NULL),
(257, 11, 'lasers', 4, NULL),
(258, 11, 'lasers', 5, NULL),
(259, 11, 'lasers', 6, NULL),
(260, 11, 'lasers', 7, NULL),
(261, 11, 'lasers', 8, NULL),
(262, 11, 'lasers', 9, NULL),
(263, 11, 'lasers', 10, NULL),
(264, 11, 'lasers', 11, NULL),
(265, 11, 'lasers', 12, NULL),
(266, 11, 'lasers', 13, NULL),
(267, 11, 'lasers', 14, NULL),
(268, 11, 'generators', 0, NULL),
(269, 11, 'generators', 1, NULL),
(270, 11, 'generators', 2, NULL),
(271, 11, 'generators', 3, NULL),
(272, 11, 'generators', 4, NULL),
(273, 11, 'generators', 5, NULL),
(274, 11, 'generators', 6, NULL),
(275, 11, 'generators', 7, NULL),
(276, 11, 'generators', 8, NULL),
(277, 11, 'generators', 9, NULL),
(278, 11, 'generators', 10, NULL),
(279, 11, 'generators', 11, NULL),
(280, 11, 'generators', 12, NULL),
(281, 11, 'generators', 13, NULL),
(282, 11, 'generators', 14, NULL),
(283, 11, 'extras', 0, NULL),
(284, 11, 'extras', 1, NULL),
(285, 11, 'extras', 2, NULL),
(286, 12, 'lasers', 0, NULL),
(287, 12, 'lasers', 1, NULL),
(288, 12, 'lasers', 2, NULL),
(289, 12, 'lasers', 3, NULL),
(290, 12, 'lasers', 4, NULL),
(291, 12, 'lasers', 5, NULL),
(292, 12, 'lasers', 6, NULL),
(293, 12, 'lasers', 7, NULL),
(294, 12, 'lasers', 8, NULL),
(295, 12, 'lasers', 9, NULL),
(296, 12, 'lasers', 10, NULL),
(297, 12, 'lasers', 11, NULL),
(298, 12, 'lasers', 12, NULL),
(299, 12, 'lasers', 13, NULL),
(300, 12, 'lasers', 14, NULL),
(301, 12, 'generators', 0, NULL),
(302, 12, 'generators', 1, NULL),
(303, 12, 'generators', 2, NULL),
(304, 12, 'generators', 3, NULL),
(305, 12, 'generators', 4, NULL),
(306, 12, 'generators', 5, NULL),
(307, 12, 'generators', 6, NULL),
(308, 12, 'generators', 7, NULL),
(309, 12, 'generators', 8, NULL),
(310, 12, 'generators', 9, NULL),
(311, 12, 'generators', 10, NULL),
(312, 12, 'generators', 11, NULL),
(313, 12, 'generators', 12, NULL),
(314, 12, 'generators', 13, NULL),
(315, 12, 'generators', 14, NULL),
(316, 12, 'extras', 0, NULL),
(317, 12, 'extras', 1, NULL),
(318, 12, 'extras', 2, NULL),
(913, 43, 'lasers', 0, NULL),
(914, 43, 'lasers', 1, NULL),
(915, 43, 'lasers', 2, NULL),
(916, 43, 'lasers', 3, NULL),
(917, 43, 'lasers', 4, NULL),
(918, 43, 'lasers', 5, NULL),
(919, 43, 'lasers', 6, NULL),
(920, 43, 'lasers', 7, NULL),
(921, 43, 'lasers', 8, NULL),
(922, 43, 'lasers', 9, NULL),
(923, 43, 'lasers', 10, NULL),
(924, 43, 'lasers', 11, NULL),
(925, 43, 'lasers', 12, NULL),
(926, 43, 'lasers', 13, NULL),
(927, 43, 'lasers', 14, NULL),
(928, 43, 'generators', 0, NULL),
(929, 43, 'generators', 1, NULL),
(930, 43, 'generators', 2, NULL),
(931, 43, 'generators', 3, NULL),
(932, 43, 'generators', 4, NULL),
(933, 43, 'generators', 5, NULL),
(934, 43, 'generators', 6, NULL),
(935, 43, 'generators', 7, NULL),
(936, 43, 'generators', 8, NULL),
(937, 43, 'generators', 9, NULL),
(938, 43, 'generators', 10, NULL),
(939, 43, 'generators', 11, NULL),
(940, 43, 'generators', 12, NULL),
(941, 43, 'generators', 13, NULL),
(942, 43, 'generators', 14, NULL),
(943, 43, 'extras', 0, NULL),
(944, 43, 'extras', 1, NULL),
(945, 43, 'extras', 2, NULL),
(946, 44, 'lasers', 0, NULL),
(947, 44, 'lasers', 1, NULL),
(948, 44, 'lasers', 2, NULL),
(949, 44, 'lasers', 3, NULL),
(950, 44, 'lasers', 4, NULL),
(951, 44, 'lasers', 5, NULL),
(952, 44, 'lasers', 6, NULL),
(953, 44, 'lasers', 7, NULL),
(954, 44, 'lasers', 8, NULL),
(955, 44, 'lasers', 9, NULL),
(956, 44, 'lasers', 10, NULL),
(957, 44, 'lasers', 11, NULL),
(958, 44, 'lasers', 12, NULL),
(959, 44, 'lasers', 13, NULL),
(960, 44, 'lasers', 14, NULL),
(961, 44, 'generators', 0, NULL),
(962, 44, 'generators', 1, NULL),
(963, 44, 'generators', 2, NULL),
(964, 44, 'generators', 3, NULL),
(965, 44, 'generators', 4, NULL),
(966, 44, 'generators', 5, NULL),
(967, 44, 'generators', 6, NULL),
(968, 44, 'generators', 7, NULL),
(969, 44, 'generators', 8, NULL),
(970, 44, 'generators', 9, NULL),
(971, 44, 'generators', 10, NULL),
(972, 44, 'generators', 11, NULL),
(973, 44, 'generators', 12, NULL),
(974, 44, 'generators', 13, NULL),
(975, 44, 'generators', 14, NULL),
(976, 44, 'extras', 0, NULL),
(977, 44, 'extras', 1, NULL),
(978, 44, 'extras', 2, NULL),
(1375, 63, 'lasers', 0, NULL),
(1376, 63, 'lasers', 1, NULL),
(1377, 63, 'lasers', 2, NULL),
(1378, 63, 'lasers', 3, NULL),
(1379, 63, 'lasers', 4, NULL),
(1380, 63, 'lasers', 5, NULL),
(1381, 63, 'lasers', 6, NULL),
(1382, 63, 'lasers', 7, NULL),
(1383, 63, 'lasers', 8, NULL),
(1384, 63, 'lasers', 9, NULL),
(1385, 63, 'lasers', 10, NULL),
(1386, 63, 'lasers', 11, NULL),
(1387, 63, 'lasers', 12, NULL),
(1388, 63, 'lasers', 13, NULL),
(1389, 63, 'lasers', 14, NULL),
(1390, 63, 'generators', 0, NULL),
(1391, 63, 'generators', 1, NULL),
(1392, 63, 'generators', 2, NULL),
(1393, 63, 'generators', 3, NULL),
(1394, 63, 'generators', 4, NULL),
(1395, 63, 'generators', 5, NULL),
(1396, 63, 'generators', 6, NULL),
(1397, 63, 'generators', 7, NULL),
(1398, 63, 'generators', 8, NULL),
(1399, 63, 'generators', 9, NULL),
(1400, 63, 'generators', 10, NULL),
(1401, 63, 'generators', 11, NULL),
(1402, 63, 'generators', 12, NULL),
(1403, 63, 'generators', 13, NULL),
(1404, 63, 'generators', 14, NULL),
(1405, 63, 'extras', 0, NULL),
(1406, 63, 'extras', 1, NULL),
(1407, 63, 'extras', 2, NULL),
(1408, 64, 'lasers', 0, NULL),
(1409, 64, 'lasers', 1, NULL),
(1410, 64, 'lasers', 2, NULL),
(1411, 64, 'lasers', 3, NULL),
(1412, 64, 'lasers', 4, NULL),
(1413, 64, 'lasers', 5, NULL),
(1414, 64, 'lasers', 6, NULL),
(1415, 64, 'lasers', 7, NULL),
(1416, 64, 'lasers', 8, NULL),
(1417, 64, 'lasers', 9, NULL),
(1418, 64, 'lasers', 10, NULL),
(1419, 64, 'lasers', 11, NULL),
(1420, 64, 'lasers', 12, NULL),
(1421, 64, 'lasers', 13, NULL),
(1422, 64, 'lasers', 14, NULL),
(1423, 64, 'generators', 0, NULL),
(1424, 64, 'generators', 1, NULL),
(1425, 64, 'generators', 2, NULL),
(1426, 64, 'generators', 3, NULL),
(1427, 64, 'generators', 4, NULL),
(1428, 64, 'generators', 5, NULL),
(1429, 64, 'generators', 6, NULL),
(1430, 64, 'generators', 7, NULL),
(1431, 64, 'generators', 8, NULL),
(1432, 64, 'generators', 9, NULL),
(1433, 64, 'generators', 10, NULL),
(1434, 64, 'generators', 11, NULL),
(1435, 64, 'generators', 12, NULL),
(1436, 64, 'generators', 13, NULL),
(1437, 64, 'generators', 14, NULL),
(1438, 64, 'extras', 0, NULL),
(1439, 64, 'extras', 1, NULL),
(1440, 64, 'extras', 2, NULL),
(1771, 85, 'lasers', 0, NULL),
(1772, 85, 'lasers', 1, NULL),
(1773, 85, 'lasers', 2, NULL),
(1774, 85, 'lasers', 3, NULL),
(1775, 85, 'lasers', 4, NULL),
(1776, 85, 'lasers', 5, NULL),
(1777, 85, 'lasers', 6, NULL),
(1778, 85, 'lasers', 7, NULL),
(1779, 85, 'lasers', 8, NULL),
(1780, 85, 'lasers', 9, NULL),
(1781, 85, 'lasers', 10, NULL),
(1782, 85, 'lasers', 11, NULL),
(1783, 85, 'lasers', 12, NULL),
(1784, 85, 'lasers', 13, NULL),
(1785, 85, 'lasers', 14, NULL),
(1786, 85, 'generators', 0, 2),
(1787, 85, 'generators', 1, 2),
(1788, 85, 'generators', 2, NULL),
(1789, 85, 'generators', 3, NULL),
(1790, 85, 'generators', 4, NULL),
(1791, 85, 'generators', 5, NULL),
(1792, 85, 'generators', 6, NULL),
(1793, 85, 'generators', 7, NULL),
(1794, 85, 'generators', 8, NULL),
(1795, 85, 'generators', 9, NULL),
(1796, 85, 'generators', 10, NULL),
(1797, 85, 'generators', 11, NULL),
(1798, 85, 'generators', 12, 2),
(1799, 85, 'generators', 13, NULL),
(1800, 85, 'generators', 14, NULL),
(1801, 85, 'extras', 0, NULL),
(1802, 85, 'extras', 1, NULL),
(1803, 85, 'extras', 2, NULL),
(1804, 86, 'lasers', 0, NULL),
(1805, 86, 'lasers', 1, NULL),
(1806, 86, 'lasers', 2, NULL),
(1807, 86, 'lasers', 3, NULL),
(1808, 86, 'lasers', 4, NULL),
(1809, 86, 'lasers', 5, NULL),
(1810, 86, 'lasers', 6, NULL),
(1811, 86, 'lasers', 7, NULL),
(1812, 86, 'lasers', 8, NULL),
(1813, 86, 'lasers', 9, NULL),
(1814, 86, 'lasers', 10, NULL),
(1815, 86, 'lasers', 11, NULL),
(1816, 86, 'lasers', 12, NULL),
(1817, 86, 'lasers', 13, NULL),
(1818, 86, 'lasers', 14, NULL),
(1819, 86, 'generators', 0, 4),
(1820, 86, 'generators', 1, 4),
(1821, 86, 'generators', 2, 4),
(1822, 86, 'generators', 3, 4),
(1823, 86, 'generators', 4, 4),
(1824, 86, 'generators', 5, 4),
(1825, 86, 'generators', 6, 4),
(1826, 86, 'generators', 7, 4),
(1827, 86, 'generators', 8, 4),
(1828, 86, 'generators', 9, 4),
(1829, 86, 'generators', 10, 4),
(1830, 86, 'generators', 11, 4),
(1831, 86, 'generators', 12, 4),
(1832, 86, 'generators', 13, 4),
(1833, 86, 'generators', 14, 4),
(1834, 86, 'extras', 0, NULL),
(1835, 86, 'extras', 1, NULL),
(1836, 86, 'extras', 2, NULL),
(3421, 154, 'lasers', 0, NULL),
(3422, 154, 'generators', 0, NULL),
(3423, 154, 'extras', 0, NULL),
(3424, 155, 'lasers', 0, NULL),
(3425, 155, 'generators', 0, NULL),
(3426, 155, 'extras', 0, NULL),
(3493, 319, 'lasers', 0, NULL),
(3494, 319, 'lasers', 1, NULL),
(3495, 319, 'lasers', 2, NULL),
(3496, 319, 'lasers', 3, NULL),
(3497, 319, 'lasers', 4, NULL),
(3498, 319, 'lasers', 5, NULL),
(3499, 319, 'generators', 0, NULL),
(3500, 319, 'generators', 1, NULL),
(3501, 319, 'generators', 2, NULL),
(3502, 319, 'generators', 3, NULL),
(3503, 319, 'generators', 4, NULL),
(3504, 319, 'generators', 5, NULL),
(3505, 319, 'generators', 6, NULL),
(3506, 319, 'generators', 7, NULL),
(3507, 319, 'extras', 0, NULL),
(3508, 319, 'extras', 1, NULL),
(3509, 320, 'lasers', 0, NULL),
(3510, 320, 'lasers', 1, NULL),
(3511, 320, 'lasers', 2, NULL),
(3512, 320, 'lasers', 3, NULL),
(3513, 320, 'lasers', 4, NULL),
(3514, 320, 'lasers', 5, NULL),
(3515, 320, 'generators', 0, NULL),
(3516, 320, 'generators', 1, NULL),
(3517, 320, 'generators', 2, NULL),
(3518, 320, 'generators', 3, NULL),
(3519, 320, 'generators', 4, NULL),
(3520, 320, 'generators', 5, NULL),
(3521, 320, 'generators', 6, NULL),
(3522, 320, 'generators', 7, NULL),
(3523, 320, 'extras', 0, NULL),
(3524, 320, 'extras', 1, NULL),
(3597, 357, 'lasers', 0, NULL),
(3598, 357, 'generators', 0, NULL),
(3599, 357, 'extras', 0, NULL),
(3600, 358, 'lasers', 0, NULL),
(3601, 358, 'generators', 0, NULL),
(3602, 358, 'extras', 0, NULL),
(3603, 392, 'lasers', 0, NULL),
(3604, 392, 'lasers', 1, NULL),
(3605, 392, 'lasers', 2, NULL),
(3606, 392, 'lasers', 3, NULL),
(3607, 392, 'lasers', 4, NULL),
(3608, 392, 'lasers', 5, NULL),
(3609, 392, 'lasers', 6, NULL),
(3610, 392, 'lasers', 7, NULL),
(3611, 392, 'lasers', 8, NULL),
(3612, 392, 'lasers', 9, NULL),
(3613, 392, 'generators', 0, NULL),
(3614, 392, 'generators', 1, NULL),
(3615, 392, 'generators', 2, NULL),
(3616, 392, 'generators', 3, NULL),
(3617, 392, 'generators', 4, NULL),
(3618, 392, 'generators', 5, NULL),
(3619, 392, 'generators', 6, NULL),
(3620, 392, 'generators', 7, NULL),
(3621, 392, 'generators', 8, NULL),
(3622, 392, 'generators', 9, NULL),
(3623, 392, 'extras', 0, NULL),
(3624, 392, 'extras', 1, NULL),
(3625, 393, 'lasers', 0, NULL),
(3626, 393, 'lasers', 1, NULL),
(3627, 393, 'lasers', 2, NULL),
(3628, 393, 'lasers', 3, NULL),
(3629, 393, 'lasers', 4, NULL),
(3630, 393, 'lasers', 5, NULL),
(3631, 393, 'lasers', 6, NULL),
(3632, 393, 'lasers', 7, NULL),
(3633, 393, 'lasers', 8, NULL),
(3634, 393, 'lasers', 9, NULL),
(3635, 393, 'generators', 0, NULL),
(3636, 393, 'generators', 1, NULL),
(3637, 393, 'generators', 2, NULL),
(3638, 393, 'generators', 3, NULL),
(3639, 393, 'generators', 4, NULL),
(3640, 393, 'generators', 5, NULL),
(3641, 393, 'generators', 6, NULL),
(3642, 393, 'generators', 7, NULL),
(3643, 393, 'generators', 8, NULL),
(3644, 393, 'generators', 9, NULL),
(3645, 393, 'extras', 0, NULL),
(3646, 393, 'extras', 1, NULL),
(3647, 396, 'lasers', 0, 1),
(3648, 396, 'lasers', 1, 1),
(3649, 396, 'lasers', 2, 1),
(3650, 396, 'lasers', 3, 1),
(3651, 396, 'lasers', 4, 1),
(3652, 396, 'lasers', 5, 1),
(3653, 396, 'lasers', 6, 1),
(3654, 396, 'lasers', 7, 1),
(3655, 396, 'lasers', 8, 1),
(3656, 396, 'lasers', 9, 1),
(3657, 396, 'generators', 0, 4),
(3658, 396, 'generators', 1, 4),
(3659, 396, 'generators', 2, 4),
(3660, 396, 'generators', 3, 4),
(3661, 396, 'generators', 4, 4),
(3662, 396, 'generators', 5, 4),
(3663, 396, 'generators', 6, 4),
(3664, 396, 'generators', 7, 4),
(3665, 396, 'generators', 8, 4),
(3666, 396, 'generators', 9, 4),
(3667, 396, 'extras', 0, 20),
(3668, 396, 'extras', 1, 39),
(3669, 397, 'lasers', 0, 1),
(3670, 397, 'lasers', 1, 1),
(3671, 397, 'lasers', 2, 1),
(3672, 397, 'lasers', 3, 1),
(3673, 397, 'lasers', 4, 1),
(3674, 397, 'lasers', 5, 1),
(3675, 397, 'lasers', 6, 1),
(3676, 397, 'lasers', 7, 1),
(3677, 397, 'lasers', 8, 1),
(3678, 397, 'lasers', 9, 1),
(3679, 397, 'generators', 0, 2),
(3680, 397, 'generators', 1, 2),
(3681, 397, 'generators', 2, 2),
(3682, 397, 'generators', 3, 2),
(3683, 397, 'generators', 4, 2),
(3684, 397, 'generators', 5, 2),
(3685, 397, 'generators', 6, 2),
(3686, 397, 'generators', 7, 2),
(3687, 397, 'generators', 8, 2),
(3688, 397, 'generators', 9, 2),
(3689, 397, 'extras', 0, 20),
(3690, 397, 'extras', 1, 39);

-- --------------------------------------------------------

--
-- Structure de la table `site_daily_login_claims`
--

CREATE TABLE `site_daily_login_claims` (
  `id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `week_key` char(10) NOT NULL,
  `day_number` tinyint(3) UNSIGNED NOT NULL,
  `claim_date` date NOT NULL,
  `claimed_at` datetime NOT NULL,
  `rewards_json` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `site_daily_login_claims`
--

INSERT INTO `site_daily_login_claims` (`id`, `player_id`, `week_key`, `day_number`, `claim_date`, `claimed_at`, `rewards_json`) VALUES
(1, 1, '2026-06-08', 1, '2026-06-12', '2026-06-12 01:48:00', '[\"5,000 Uridium\",\"10,000 MCB-25\"]'),
(2, 3, '2026-06-08', 1, '2026-06-12', '2026-06-12 01:48:40', '[\"5,000 Uridium\",\"10,000 MCB-25\"]');

-- --------------------------------------------------------

--
-- Structure de la table `site_player_quests`
--

CREATE TABLE `site_player_quests` (
  `id` bigint(20) NOT NULL,
  `player_id` int(11) NOT NULL,
  `quest_id` int(11) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'in_progress',
  `baseline_json` text DEFAULT NULL,
  `progress_json` text DEFAULT NULL,
  `accepted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `claimed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_player_quests`
--

INSERT INTO `site_player_quests` (`id`, `player_id`, `quest_id`, `status`, `baseline_json`, `progress_json`, `accepted_at`, `claimed_at`) VALUES
(1, 1, 2, 'completed', '{\"npc\":[],\"ore\":{\"Prometium\":74}}', NULL, '2026-04-25 18:40:36', '2026-04-25 18:40:39'),
(2, 1, 581, 'completed', '{\"npc\":[],\"ore\":[],\"pvp\":{\"user_kill\":0}}', NULL, '2026-04-26 02:04:54', '2026-04-26 10:55:40'),
(3, 1, 1, 'completed', '{\"npc\":{\"Streuner\":146},\"ore\":{\"Prometium\":74},\"pvp\":[]}', '{\"npc\":{\"Streuner\":6},\"ore\":{\"Prometium\":8},\"ore_last\":{\"Prometium\":59},\"ore_counter_base\":{\"Prometium\":10},\"pvp\":[]}', '2026-04-26 12:10:35', '2026-04-27 01:40:19'),
(4, 3, 1, 'completed', '{\"npc\":{\"Streuner\":18},\"ore\":{\"Prometium\":6},\"pvp\":[]}', NULL, '2026-04-26 12:10:56', '2026-04-26 14:04:41'),
(5, 3, 2, 'completed', '{\"npc\":[],\"ore\":{\"Prometium\":6},\"pvp\":[]}', NULL, '2026-04-26 13:14:42', '2026-04-26 14:16:35'),
(7, 1, 3, 'completed', '{\"npc\":[],\"ore\":{\"Prometium\":60},\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', '{\"npc\":[],\"ore\":{\"Prometium\":40},\"ore_last\":[],\"ore_counter_base\":[],\"pvp\":[]}', '2026-04-27 01:41:15', '2026-04-27 01:42:58'),
(8, 1, 4, 'completed', '{\"npc\":[],\"ore\":{\"Prometium\":60},\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', '{\"npc\":[],\"ore\":{\"Prometium\":80},\"ore_last\":[],\"ore_counter_base\":[],\"pvp\":[]}', '2026-04-27 01:41:21', '2026-04-27 01:43:00'),
(9, 1, 10, 'completed', '{\"npc\":{\"Streuner\":156},\"ore\":[],\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', '{\"npc\":{\"Streuner\":1},\"ore\":[],\"ore_last\":[],\"ore_counter_base\":[],\"pvp\":[]}', '2026-04-27 01:48:42', '2026-04-27 20:43:33'),
(10, 1, 11, 'completed', '{\"npc\":{\"Streuner\":156},\"ore\":[],\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', '{\"npc\":{\"Streuner\":1},\"ore\":[],\"ore_last\":[],\"ore_counter_base\":[],\"pvp\":[]}', '2026-04-27 01:48:48', '2026-04-28 01:32:00'),
(12, 1, 5, 'completed', '{\"npc\":[],\"ore\":{\"Endurium\":330},\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', NULL, '2026-04-27 20:41:51', '2026-04-27 20:43:41'),
(13, 1, 12, 'completed', '{\"npc\":{\"Streuner\":185},\"ore\":[],\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', NULL, '2026-04-28 01:34:08', '2026-04-28 12:21:57'),
(14, 1, 13, 'completed', '{\"npc\":{\"Lordakia\":233},\"ore\":[],\"pvp\":[],\"ore_source\":\"quest_ore_counts\"}', NULL, '2026-04-28 12:22:26', '2026-04-28 12:24:11');

-- --------------------------------------------------------

--
-- Structure de la table `site_player_quest_objective_progress`
--

CREATE TABLE `site_player_quest_objective_progress` (
  `player_id` int(11) NOT NULL,
  `quest_id` int(11) NOT NULL,
  `objective_type` varchar(32) NOT NULL,
  `target_key` varchar(64) NOT NULL,
  `current_amount` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_player_quest_objective_progress`
--

INSERT INTO `site_player_quest_objective_progress` (`player_id`, `quest_id`, `objective_type`, `target_key`, `current_amount`, `updated_at`) VALUES
(1, 5, 'ore_have', 'Endurium', 30, '2026-04-27 20:43:14'),
(1, 10, 'npc_kill', 'Streuner', 5, '2026-04-27 20:43:12'),
(1, 11, 'npc_kill', 'Streuner', 10, '2026-04-28 01:31:55'),
(1, 12, 'npc_kill', 'Streuner', 20, '2026-04-28 01:35:52'),
(1, 13, 'npc_kill', 'Lordakia', 10, '2026-04-28 12:24:04');

-- --------------------------------------------------------

--
-- Structure de la table `site_player_weekly_missions`
--

CREATE TABLE `site_player_weekly_missions` (
  `id` bigint(20) NOT NULL,
  `player_id` int(11) NOT NULL,
  `mission_id` int(11) NOT NULL,
  `week_key` varchar(10) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'in_progress',
  `accepted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `claimed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_player_weekly_missions`
--

INSERT INTO `site_player_weekly_missions` (`id`, `player_id`, `mission_id`, `week_key`, `status`, `accepted_at`, `claimed_at`) VALUES
(1, 1, 1, '2026-W23', 'in_progress', '2026-06-01 17:52:47', NULL),
(2, 1, 2, '2026-W23', 'in_progress', '2026-06-01 17:52:47', NULL),
(3, 1, 3, '2026-W23', 'in_progress', '2026-06-01 17:52:47', NULL),
(4, 1, 4, '2026-W23', 'in_progress', '2026-06-01 17:52:47', NULL),
(5, 1, 5, '2026-W23', 'in_progress', '2026-06-01 17:52:47', NULL),
(19, 3, 1, '2026-W23', 'in_progress', '2026-06-02 02:24:54', NULL),
(20, 3, 2, '2026-W23', 'in_progress', '2026-06-02 02:24:54', NULL),
(21, 3, 3, '2026-W23', 'in_progress', '2026-06-02 02:24:54', NULL),
(22, 3, 4, '2026-W23', 'in_progress', '2026-06-02 02:24:54', NULL),
(23, 3, 5, '2026-W23', 'in_progress', '2026-06-02 02:24:54', NULL),
(91, 1, 6, '2026-W24', 'in_progress', '2026-06-08 23:22:43', NULL),
(92, 1, 7, '2026-W24', 'in_progress', '2026-06-08 23:22:43', NULL),
(93, 1, 8, '2026-W24', 'in_progress', '2026-06-08 23:22:43', NULL),
(94, 1, 9, '2026-W24', 'in_progress', '2026-06-08 23:22:43', NULL),
(95, 1, 10, '2026-W24', 'in_progress', '2026-06-08 23:22:43', NULL),
(220, 3, 6, '2026-W24', 'in_progress', '2026-06-11 02:36:03', NULL),
(221, 3, 7, '2026-W24', 'in_progress', '2026-06-11 02:36:03', NULL),
(222, 3, 8, '2026-W24', 'in_progress', '2026-06-11 02:36:03', NULL),
(223, 3, 9, '2026-W24', 'in_progress', '2026-06-11 02:36:03', NULL),
(224, 3, 10, '2026-W24', 'in_progress', '2026-06-11 02:36:03', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `site_player_weekly_mission_progress`
--

CREATE TABLE `site_player_weekly_mission_progress` (
  `player_id` int(11) NOT NULL,
  `mission_id` int(11) NOT NULL,
  `week_key` varchar(10) NOT NULL,
  `objective_type` varchar(32) NOT NULL,
  `target_key` varchar(96) NOT NULL,
  `current_amount` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_player_weekly_mission_progress`
--

INSERT INTO `site_player_weekly_mission_progress` (`player_id`, `mission_id`, `week_key`, `objective_type`, `target_key`, `current_amount`, `updated_at`) VALUES
(1, 1, '2026-W23', 'weekly_npc_kill', '0:Devolarium', 0, '2026-06-01 17:52:47'),
(1, 1, '2026-W23', 'weekly_npc_kill', '0:Lordakia', 4, '2026-06-06 11:49:15'),
(1, 1, '2026-W23', 'weekly_npc_kill', '0:Mordon', 0, '2026-06-01 17:52:47'),
(1, 1, '2026-W23', 'weekly_npc_kill', '0:Saimon', 0, '2026-06-01 17:52:47'),
(1, 1, '2026-W23', 'weekly_npc_kill', '0:Streuner', 0, '2026-06-01 17:52:47'),
(1, 2, '2026-W23', 'weekly_npc_kill', '0:Kristallin', 3, '2026-06-06 11:40:08'),
(1, 2, '2026-W23', 'weekly_npc_kill', '0:Kristallon', 0, '2026-06-01 17:52:47'),
(1, 2, '2026-W23', 'weekly_npc_kill', '0:Lordakium', 2, '2026-06-04 02:34:18'),
(1, 2, '2026-W23', 'weekly_npc_kill', '0:Sibelon', 0, '2026-06-01 17:52:47'),
(1, 2, '2026-W23', 'weekly_npc_kill', '0:Sibelonit', 7, '2026-06-06 11:49:19'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Devolarium', 3, '2026-06-02 03:34:39'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Kristallon', 0, '2026-06-01 17:52:47'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Lordakium', 1, '2026-06-02 03:32:43'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Mordon', 0, '2026-06-01 17:52:47'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Saimon', 3, '2026-06-02 03:33:33'),
(1, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Sibelonit', 3, '2026-06-02 03:33:44'),
(1, 4, '2026-W23', 'weekly_npc_kill', '29:Boss Cubikon', 7, '2026-06-02 03:34:36'),
(1, 4, '2026-W23', 'weekly_npc_kill', '29:Boss Protegit', 16, '2026-06-02 03:35:36'),
(1, 5, '2026-W23', 'weekly_player_kill', 'eligible_enemy_pilot', 0, '2026-06-01 17:52:47'),
(1, 6, '2026-W24', 'weekly_npc_kill', '0:Lordakia', 20, '2026-06-12 19:11:36'),
(1, 6, '2026-W24', 'weekly_npc_kill', '0:Mordon', 0, '2026-06-08 23:22:43'),
(1, 6, '2026-W24', 'weekly_npc_kill', '0:Saimon', 4, '2026-06-12 19:19:45'),
(1, 6, '2026-W24', 'weekly_npc_kill', '0:Streuner', 13, '2026-06-12 19:09:34'),
(1, 7, '2026-W24', 'weekly_npc_kill', '0:Kristallin', 1, '2026-06-09 01:41:07'),
(1, 7, '2026-W24', 'weekly_npc_kill', '0:Kristallon', 1, '2026-06-09 01:16:06'),
(1, 7, '2026-W24', 'weekly_npc_kill', '0:Lordakium', 1, '2026-06-08 23:23:06'),
(1, 7, '2026-W24', 'weekly_npc_kill', '0:Sibelonit', 0, '2026-06-08 23:22:43'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Kristallin', 7, '2026-06-11 12:32:42'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Lordakia', 8, '2026-06-12 12:27:25'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Mordon', 6, '2026-06-10 01:28:21'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Saimon', 8, '2026-06-12 12:27:27'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Sibelon', 2, '2026-06-09 20:03:37'),
(1, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Streuner', 11, '2026-06-11 01:27:54'),
(1, 9, '2026-W24', 'weekly_npc_kill', '29:Boss Cubikon', 6, '2026-06-08 23:25:46'),
(1, 9, '2026-W24', 'weekly_npc_kill', '29:Boss Protegit', 4, '2026-06-09 12:39:45'),
(1, 10, '2026-W24', 'weekly_player_kill', 'eligible_enemy_pilot', 0, '2026-06-08 23:22:43'),
(3, 1, '2026-W23', 'weekly_npc_kill', '0:Devolarium', 0, '2026-06-02 02:24:54'),
(3, 1, '2026-W23', 'weekly_npc_kill', '0:Lordakia', 0, '2026-06-02 02:24:54'),
(3, 1, '2026-W23', 'weekly_npc_kill', '0:Mordon', 0, '2026-06-02 02:24:54'),
(3, 1, '2026-W23', 'weekly_npc_kill', '0:Saimon', 0, '2026-06-02 02:24:54'),
(3, 1, '2026-W23', 'weekly_npc_kill', '0:Streuner', 0, '2026-06-02 02:24:54'),
(3, 2, '2026-W23', 'weekly_npc_kill', '0:Kristallin', 0, '2026-06-02 02:24:54'),
(3, 2, '2026-W23', 'weekly_npc_kill', '0:Kristallon', 0, '2026-06-02 02:24:54'),
(3, 2, '2026-W23', 'weekly_npc_kill', '0:Lordakium', 0, '2026-06-02 02:24:54'),
(3, 2, '2026-W23', 'weekly_npc_kill', '0:Sibelon', 0, '2026-06-02 02:24:54'),
(3, 2, '2026-W23', 'weekly_npc_kill', '0:Sibelonit', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Devolarium', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Kristallon', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Lordakium', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Mordon', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Saimon', 0, '2026-06-02 02:24:54'),
(3, 3, '2026-W23', 'weekly_npc_kill', '29:Uber Sibelonit', 0, '2026-06-02 02:24:54'),
(3, 4, '2026-W23', 'weekly_npc_kill', '29:Boss Cubikon', 0, '2026-06-02 02:24:54'),
(3, 4, '2026-W23', 'weekly_npc_kill', '29:Boss Protegit', 0, '2026-06-02 02:24:54'),
(3, 5, '2026-W23', 'weekly_player_kill', 'eligible_enemy_pilot', 0, '2026-06-02 02:24:54'),
(3, 6, '2026-W24', 'weekly_npc_kill', '0:Lordakia', 0, '2026-06-11 02:36:03'),
(3, 6, '2026-W24', 'weekly_npc_kill', '0:Mordon', 0, '2026-06-11 02:36:03'),
(3, 6, '2026-W24', 'weekly_npc_kill', '0:Saimon', 0, '2026-06-11 02:36:03'),
(3, 6, '2026-W24', 'weekly_npc_kill', '0:Streuner', 0, '2026-06-11 02:36:03'),
(3, 7, '2026-W24', 'weekly_npc_kill', '0:Kristallin', 0, '2026-06-11 02:36:03'),
(3, 7, '2026-W24', 'weekly_npc_kill', '0:Kristallon', 0, '2026-06-11 02:36:03'),
(3, 7, '2026-W24', 'weekly_npc_kill', '0:Lordakium', 0, '2026-06-11 02:36:03'),
(3, 7, '2026-W24', 'weekly_npc_kill', '0:Sibelonit', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Kristallin', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Lordakia', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Mordon', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Saimon', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Sibelon', 0, '2026-06-11 02:36:03'),
(3, 8, '2026-W24', 'weekly_npc_kill', '29:Uber Streuner', 0, '2026-06-11 02:36:03'),
(3, 9, '2026-W24', 'weekly_npc_kill', '29:Boss Cubikon', 0, '2026-06-11 02:36:03'),
(3, 9, '2026-W24', 'weekly_npc_kill', '29:Boss Protegit', 0, '2026-06-11 02:36:03'),
(3, 10, '2026-W24', 'weekly_player_kill', 'eligible_enemy_pilot', 0, '2026-06-11 02:36:03');

-- --------------------------------------------------------

--
-- Structure de la table `site_purchase_log`
--

CREATE TABLE `site_purchase_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `player_id` int(11) NOT NULL,
  `source` varchar(40) NOT NULL,
  `item_code` varchar(80) NOT NULL,
  `item_name` varchar(160) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `currency` varchar(20) DEFAULT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL,
  `message` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_purchase_log`
--

INSERT INTO `site_purchase_log` (`id`, `player_id`, `source`, `item_code`, `item_name`, `quantity`, `currency`, `price`, `status`, `message`, `created_at`) VALUES
(1, 1, 'shop_ships', 'ship1', 'Phoenix', 1, 'credits', 0, 'success', 'Transaction successful! Phoenix equipped. Previous equipment moved to inventory.', '2026-04-27 23:06:06'),
(2, 1, 'shop_ships', 'ship10', 'Goliath', 1, 'uridium', 80000, 'success', 'Transaction successful! Goliath equipped. Previous equipment moved to inventory.', '2026-04-27 23:06:09'),
(3, 1, 'shop_boosters', 'damage_booster', 'Damage Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-04-27 23:06:23'),
(4, 1, 'shop_boosters', 'hp_booster', 'HP Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-04-27 23:06:25'),
(5, 1, 'shop_boosters', 'shield_booster', 'Shield Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-04-27 23:06:27'),
(6, 1, 'shop_items', 'havok', 'Havok Drone Design', 1, 'uridium', 100000, 'success', 'Bought: 1x Havok Drone Design', '2026-05-02 20:01:19'),
(7, 1, 'shop_boosters', 'damage_booster', 'Damage Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-05-03 01:29:52'),
(8, 1, 'shop_boosters', 'damage_booster', 'Damage Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-05-08 04:14:40'),
(9, 1, 'shop_ammo', 'ubr100', 'UBR100', 1000, 'uridium', 30000, 'success', 'Purchased 1,000 unit(s) of UBR100', '2026-05-08 04:15:24'),
(10, 1, 'shop_ammo', 'emp01', 'EMP01', 100, 'uridium', 50000, 'success', 'Purchased 100 unit(s) of EMP01', '2026-05-12 12:46:17'),
(11, 1, 'shop_ammo', 'rsb75', 'RSB75', 1000, 'uridium', 5000, 'success', 'Purchased 1,000 unit(s) of RSB75', '2026-05-13 11:09:43'),
(12, 1, 'shop_ammo', 'smb01', 'SMB01', 100, 'uridium', 40000, 'success', 'Purchased 100 unit(s) of SMB01', '2026-05-13 20:13:55'),
(13, 1, 'shop_ammo', 'ish01', 'ISH01', 100, 'uridium', 40000, 'success', 'Purchased 100 unit(s) of ISH01', '2026-05-13 20:14:01'),
(14, 1, 'shop_ammo', 'emp01', 'EMP01', 100, 'uridium', 50000, 'success', 'Purchased 100 unit(s) of EMP01', '2026-05-13 20:14:05'),
(15, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 500, 'success', 'Purchase success !', '2026-05-20 23:00:16'),
(16, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 1700, 'success', 'Purchase success !', '2026-05-20 23:00:17'),
(17, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 3700, 'success', 'Purchase success !', '2026-05-20 23:00:18'),
(18, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 6500, 'success', 'Purchase success !', '2026-05-20 23:00:20'),
(19, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 10100, 'success', 'Purchase success !', '2026-05-20 23:00:21'),
(20, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 14500, 'success', 'Purchase success !', '2026-05-20 23:00:22'),
(21, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 19700, 'success', 'Purchase success !', '2026-05-20 23:00:29'),
(22, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 25700, 'success', 'Purchase success !', '2026-05-20 23:00:31'),
(23, 1, 'user_upgrades', 'healt_upgrade', 'HP Upgrade', 1, 'uridium', 32500, 'success', 'Purchase success !', '2026-05-20 23:00:32'),
(24, 1, 'shop_ships', 'ship6', 'Piranha', 1, 'credits', 80000, 'success', 'Transaction successful! Piranha equipped. Previous equipment moved to inventory.', '2026-05-26 03:46:17'),
(25, 1, 'shop_ships', 'ship1', 'Phoenix', 1, 'credits', 0, 'success', 'Transaction successful! Phoenix equipped. Previous equipment moved to inventory.', '2026-05-26 03:47:01'),
(26, 1, 'shop_ships', 'ship10', 'Goliath', 1, 'uridium', 80000, 'success', 'Transaction successful! Goliath equipped. Previous equipment moved to inventory.', '2026-05-30 21:35:32'),
(27, 1, 'shop_boosters', 'damage_booster', 'Damage Booster', 1, 'uridium', 10000, 'success', 'Purchase success !', '2026-05-30 23:06:04'),
(28, 1, 'shop_ammo', 'ish01', 'ISH01', 100, 'uridium', 40000, 'success', 'Purchased 100 unit(s) of ISH01', '2026-06-11 12:30:31'),
(29, 1, 'shop_designs', 'design18', 'Vengeance Lightning', 1, 'uridium', 100000, 'success', 'Congratulations! You purchased the Vengeance Lightning. You can equip it in the Configurations tab.', '2026-06-12 12:23:46'),
(30, 1, 'shop_ships', 'ship8', 'Vengeance', 1, 'uridium', 30000, 'success', 'Transaction successful! Vengeance equipped. Previous equipment moved to inventory.', '2026-06-12 12:23:59');

-- --------------------------------------------------------

--
-- Structure de la table `site_quests`
--

CREATE TABLE `site_quests` (
  `id` int(11) NOT NULL,
  `code` varchar(64) NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(64) NOT NULL DEFAULT 'Basic',
  `min_level` int(11) NOT NULL DEFAULT 0,
  `reward_credits` bigint(20) NOT NULL DEFAULT 0,
  `reward_uridium` bigint(20) NOT NULL DEFAULT 0,
  `reward_experience` bigint(20) NOT NULL DEFAULT 0,
  `reward_honor` bigint(20) NOT NULL DEFAULT 0,
  `reward_ucb100` bigint(20) NOT NULL DEFAULT 0,
  `reward_rsb75` bigint(20) NOT NULL DEFAULT 0,
  `reward_seprom` bigint(20) NOT NULL DEFAULT 0,
  `reward_item_id` int(11) NOT NULL DEFAULT 0,
  `reward_item_qty` int(11) NOT NULL DEFAULT 0,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_quests`
--

INSERT INTO `site_quests` (`id`, `code`, `title`, `description`, `category`, `min_level`, `reward_credits`, `reward_uridium`, `reward_experience`, `reward_honor`, `reward_ucb100`, `reward_rsb75`, `reward_seprom`, `reward_item_id`, `reward_item_qty`, `enabled`, `sort_order`, `updated_at`) VALUES
(1, 'first_assignment', 'First assignment', 'Time for your first assignment: collect 8 Prometium found in cargo when a ship is destroyed, then destroy 6 Streuners.', 'Starter', 0, 2000000, 12000, 0, 0, 0, 0, 0, 0, 0, 1, 10, '2026-04-25 20:50:09'),
(2, 'collecting_mission_1', 'Collecting mission', 'Collect 20 Prometium, the little red rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 1000000, 6000, 0, 0, 0, 0, 0, 0, 0, 1, 20, '2026-04-25 20:50:09'),
(3, 'collecting_mission_2', 'Collecting mission (2)', 'Collect 40 Prometium, the little red rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 2000000, 12000, 0, 0, 0, 0, 0, 0, 0, 1, 30, '2026-04-25 20:50:09'),
(4, 'collecting_mission_3', 'Collecting mission (3)', 'Collect 80 Prometium, the little red rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 3000000, 20000, 0, 0, 0, 0, 0, 0, 0, 1, 40, '2026-04-25 20:50:09'),
(5, 'ore_wanted_now_1', 'Ore wanted now', 'Collect 30 Endurium, the blue rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 1500000, 8000, 0, 0, 0, 0, 0, 0, 0, 1, 50, '2026-04-25 20:50:09'),
(6, 'ore_wanted_now_2', 'Ore wanted now! (2)', 'Collect 60 Endurium, the blue rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 3000000, 16000, 0, 0, 0, 0, 0, 0, 0, 1, 60, '2026-04-25 20:50:09'),
(7, 'ore_wanted_now_3', 'Ore wanted now! (3)', 'Collect 120 Endurium, the blue rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 5000000, 28000, 0, 0, 0, 0, 0, 0, 0, 1, 70, '2026-04-25 20:50:09'),
(8, 'terbium_wanted_now_1', 'Terbium wanted now!', 'Collect 40 Terbium, the golden rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 3000000, 14000, 0, 0, 0, 0, 0, 0, 0, 1, 80, '2026-04-25 20:50:09'),
(9, 'terbium_wanted_now_2', 'Terbium wanted now! (2)', 'Collect 80 Terbium, the golden rocks found in cargo when a ship is destroyed.', 'Ore Collection', 0, 5000000, 26000, 0, 0, 0, 0, 0, 0, 0, 1, 90, '2026-04-25 20:50:09'),
(10, 'show_us_1', 'Show us what you\'re made of!', 'Those pesky Streuners keep interfering with our work. Destroy 5 of them.', 'NPC Hunt', 0, 1500000, 8000, 0, 0, 0, 0, 0, 0, 0, 1, 100, '2026-04-25 20:50:09'),
(11, 'show_us_2', 'Show us what you\'re made of! (2)', 'There are still way too many Streuners. Shoot down another 10 of them.', 'NPC Hunt', 0, 3000000, 15000, 0, 0, 0, 0, 0, 0, 0, 1, 110, '2026-04-25 20:50:09'),
(12, 'show_us_3', 'Show us what you\'re made of! (3)', 'The Streuners are getting harder to hold back. Destroy 20 of them.', 'NPC Hunt', 0, 5000000, 30000, 0, 0, 0, 0, 0, 0, 0, 1, 120, '2026-04-25 20:50:09'),
(13, 'lordakia_1', 'Lordakians sighted!', 'Lordakians have been sighted near our sectors. Destroy 10 Lordakia.', 'NPC Hunt', 0, 3000000, 18000, 0, 0, 0, 0, 0, 0, 0, 1, 130, '2026-04-25 20:50:09'),
(14, 'lordakia_2', 'Lordakians sighted! (2)', 'The Lordakians seem to be regrouping. Destroy 20 of them.', 'NPC Hunt', 0, 5000000, 28000, 0, 0, 0, 0, 0, 0, 0, 1, 140, '2026-04-25 20:50:09'),
(15, 'lordakia_3', 'Lordakians sighted! (3)', 'The Lordakians have started attacking our sectors. Destroy 40 Lordakia.', 'NPC Hunt', 0, 7000000, 50000, 0, 0, 0, 0, 0, 0, 0, 1, 150, '2026-04-25 20:50:09'),
(16, 'mordons_1', 'Battle of the Mordons!', 'Our scouts assume the Mordons are behind attacks around Planet Terra. Destroy 10 Mordons.', 'NPC Hunt', 0, 4000000, 22000, 0, 0, 0, 0, 0, 0, 0, 1, 160, '2026-04-25 20:50:09'),
(17, 'mordons_2', 'Battle of the Mordons! (2)', 'The Mordons are not giving up. Destroy 20 Mordons.', 'NPC Hunt', 0, 6000000, 38000, 0, 0, 0, 0, 0, 0, 0, 1, 170, '2026-04-25 20:50:09'),
(18, 'devolarian_invasion', 'Devolarian invasion!', 'Red alert! Devolariums are attacking colonies in the X-3 sectors. Destroy 3 Devolariums.', 'NPC Hunt', 0, 4000000, 25000, 0, 0, 0, 0, 0, 0, 0, 1, 180, '2026-04-25 20:50:09'),
(19, 'saimonites_1', 'Wretched Saimonites!', 'Saimonites are aggressive and fast. Destroy 20 Saimons on the X-3 and X-4 maps.', 'NPC Hunt', 0, 3000000, 24000, 0, 0, 0, 0, 0, 0, 0, 1, 190, '2026-04-25 20:50:09'),
(20, 'saimonites_2', 'Wretched Saimonites! (2)', 'We cannot allow the Saimonites to keep getting in our way. Destroy 40 Saimons.', 'NPC Hunt', 0, 3000000, 50000, 0, 0, 0, 0, 0, 0, 0, 1, 200, '2026-04-25 20:50:09'),
(581, 'pvp_first_blood', 'First Blood', 'Prove yourself in combat by destroying 1 enemy player ship.', 'PVP', 0, 1000000, 5000, 51200, 512, 500, 750, 0, 0, 0, 1, 1000, '2026-04-25 23:15:15'),
(582, 'pvp_enemy_hunter', 'Enemy Hunter', 'Hunt down enemy pilots and destroy 3 player ships.', 'PVP', 0, 2000000, 10000, 153600, 1536, 1500, 2250, 0, 0, 0, 1, 1010, '2026-04-25 23:15:15'),
(583, 'pvp_combat_pilot', 'Combat Pilot', 'Show consistent PvP skill by destroying 5 player ships.', 'PVP', 0, 3000000, 15000, 256000, 2560, 2500, 3750, 0, 0, 0, 1, 1020, '2026-04-25 23:15:15'),
(584, 'pvp_battle_tested', 'Battle Tested', 'Survive the front line and destroy 10 player ships.', 'PVP', 0, 5000000, 25000, 512000, 5120, 5000, 7500, 0, 0, 0, 1, 1030, '2026-04-25 23:15:15'),
(585, 'pvp_elite_hunter', 'Elite Hunter', 'Become a feared hunter by destroying 25 player ships.', 'PVP', 0, 7000000, 35000, 1280000, 12800, 12500, 18750, 0, 0, 0, 1, 1040, '2026-04-25 23:15:15'),
(586, 'pvp_sector_dominator', 'Sector Dominator', 'Dominate contested sectors by destroying 50 player ships.', 'PVP', 0, 10000000, 50000, 2560000, 25600, 25000, 37500, 0, 0, 0, 1, 1050, '2026-04-25 23:15:15'),
(587, 'pvp_warlord', 'Warlord', 'Reach the top of the battlefield by destroying 100 player ships.', 'PVP', 0, 12000000, 60000, 5120000, 51200, 50000, 75000, 0, 0, 0, 1, 1060, '2026-04-25 23:15:15'),
(85611, 'havok_cubikon_100', 'Havok Trial: Cubikon', 'Destroy 100 Cubikons after accepting this quest to earn one Havok drone design.', 'Havok', 0, 75000000, 25000, 7500000, 50000, 8000, 5000, 500, 9001, 1, 1, 2000, '2026-05-04 01:15:40'),
(85612, 'havok_delta_5', 'Havok Trial: Delta Gates', 'Complete 10 Galaxy Gate Delta runs after accepting this quest to earn one Havok drone design.', 'Havok', 0, 90000000, 30000, 8500000, 55000, 9000, 6000, 600, 9001, 1, 1, 2010, '2026-05-04 01:15:40'),
(85613, 'havok_beta_5', 'Havok Trial: Beta Gates', 'Complete 10 Galaxy Gate Beta runs after accepting this quest to earn one Havok drone design.', 'Havok', 0, 75000000, 25000, 7500000, 50000, 8000, 5000, 500, 9001, 1, 1, 2020, '2026-05-04 01:15:40'),
(85614, 'havok_alpha_5', 'Havok Trial: Alpha Gates', 'Complete 10 Galaxy Gate Alpha runs after accepting this quest to earn one Havok drone design.', 'Havok', 0, 60000000, 20000, 6000000, 40000, 7000, 4000, 400, 9001, 1, 1, 2030, '2026-05-04 01:15:40'),
(85615, 'havok_gamma_5', 'Havok Trial: Gamma Gates', 'Complete 5 Galaxy Gate Gamma runs after accepting this quest to earn one Havok drone design.', 'Havok', 0, 105000000, 35000, 10000000, 70000, 11000, 7000, 700, 9001, 1, 1, 2040, '2026-05-04 01:15:40'),
(85616, 'havok_kristallon_100', 'Havok Trial: Kristallon', 'Destroy 500 Kristallons after accepting this quest to earn one Havok drone design.', 'Havok', 0, 115000000, 35000, 11000000, 75000, 11000, 7000, 700, 9001, 1, 1, 2050, '2026-05-04 01:15:40'),
(85617, 'havok_streuner_r_100', 'Havok Trial: StreuneR', 'Destroy 400 StreuneR NPCs in x-8 after accepting this quest to earn one Havok drone design.', 'Havok', 0, 90000000, 30000, 8500000, 60000, 9000, 6000, 600, 9001, 1, 1, 2060, '2026-05-04 01:15:40'),
(85618, 'havok_lordakium_150', 'Havok Trial: Lordakium', 'Destroy 650 Lordakiums after accepting this quest to earn one Havok drone design.', 'Havok', 0, 190000000, 50000, 16000000, 100000, 12000, 10000, 1000, 9001, 1, 1, 2070, '2026-05-04 01:15:40'),
(89104, 'classic_diversion', 'Diversion', 'Create a diversion by destroying 1 Devolarium.', 'NPC Hunt', 0, 1500000, 8000, 0, 0, 0, 0, 0, 0, 0, 1, 210, '2026-05-12 14:57:58'),
(89105, 'classic_mysterious_cube', 'Mysterious Cube', 'Destroy 3 Saimons, 1 Devolarium and 1 Mordon to secure the sector.', 'NPC Hunt', 0, 3500000, 12000, 0, 0, 0, 0, 0, 0, 0, 1, 220, '2026-05-12 14:57:58'),
(89106, 'classic_hold_position', 'Hold Position!', 'Hold your position by destroying 10 Lordakia and 2 Devolariums.', 'NPC Hunt', 0, 5000000, 18000, 0, 0, 0, 0, 0, 0, 0, 1, 230, '2026-05-12 14:57:58'),
(89107, 'classic_tour_de_force', 'Tour de Force', 'Destroy one alien of each supported classic type, from Streuner to Cubikon.', 'NPC Hunt', 0, 25000000, 50000, 0, 0, 0, 0, 0, 0, 0, 1, 240, '2026-05-12 14:57:58'),
(89108, 'classic_sibelon_patrol', 'Sibelon Patrol', 'Clear the patrol route by destroying 10 Sibelonits and 3 Sibelons.', 'NPC Hunt', 0, 15000000, 30000, 0, 0, 0, 0, 0, 0, 0, 1, 250, '2026-05-12 14:57:58'),
(89109, 'classic_lordakium_threat', 'Lordakium Threat', 'Push back the Lordakium threat by destroying 5 Lordakiums.', 'NPC Hunt', 0, 25000000, 40000, 0, 0, 0, 0, 0, 0, 0, 1, 260, '2026-05-12 14:57:58'),
(89110, 'classic_crystal_sweep', 'Crystal Sweep', 'Sweep the crystal sectors by destroying 20 Kristallins and 5 Kristallons.', 'NPC Hunt', 0, 30000000, 50000, 0, 0, 0, 0, 0, 0, 0, 1, 270, '2026-05-12 14:57:58'),
(89111, 'classic_cubikon_ahoy', 'Cubikon Ahoy!', 'Coordinate your attack and destroy 1 Cubikon.', 'NPC Hunt', 0, 12000000, 25000, 0, 0, 0, 0, 0, 0, 0, 1, 280, '2026-05-12 14:57:58'),
(89112, 'classic_streuner_r_patrol', 'StreuneR Patrol', 'Clean up the X-8 patrol route by destroying 25 StreuneR NPCs.', 'NPC Hunt', 0, 8000000, 20000, 0, 0, 0, 0, 0, 0, 0, 1, 290, '2026-05-12 14:57:58'),
(89113, 'classic_lower_maps_cleanup', 'Lower Maps Cleanup', 'Clean up the lower maps by destroying Streuners, Lordakia, Saimons and Mordons.', 'NPC Hunt', 0, 15000000, 30000, 0, 0, 0, 0, 0, 0, 0, 1, 300, '2026-05-12 14:57:58'),
(89159, 'archive_sibelons_strike_back_1', 'Sibelons strike back!', 'Destroy 2 Sibelons in the classic alien sector campaign.', 'NPC Hunt', 0, 640000, 500, 64000, 0, 0, 0, 0, 0, 0, 1, 410, '2026-05-12 22:22:33'),
(89160, 'archive_sibelons_strike_back_2', 'Sibelons strike back! (2)', 'Destroy 4 Sibelons in the classic alien sector campaign.', 'NPC Hunt', 0, 1280000, 1000, 128000, 0, 0, 0, 0, 0, 0, 1, 420, '2026-05-12 22:22:33'),
(89161, 'archive_sibelons_strike_back_3', 'Sibelons strike back! (3)', 'Destroy 8 Sibelons in the classic alien sector campaign.', 'NPC Hunt', 0, 2560000, 2000, 256000, 0, 0, 0, 0, 0, 0, 1, 430, '2026-05-12 22:22:33'),
(89162, 'archive_200_sibelons', '200!', 'Destroy 200 Sibelons to complete this classic high-volume alien hunt.', 'NPC Hunt', 0, 65000000, 20000, 6500000, 0, 0, 0, 0, 0, 0, 1, 440, '2026-05-12 22:22:33'),
(89163, 'archive_pull_out_all_the_stops', 'Pull out all the stops', 'Destroy 10 Cubikons with your company pilots.', 'NPC Hunt', 0, 25000000, 20000, 6000000, 2000, 0, 0, 0, 0, 0, 1, 810, '2026-05-12 22:22:33'),
(89164, 'archive_plague_sibelonites_1', 'Plague of Sibelonites (1)', 'Destroy 25 Sibelonits to reduce the Sibelonit plague.', 'NPC Hunt', 0, 1000000, 2000, 80000, 0, 0, 0, 0, 0, 0, 1, 510, '2026-05-12 22:22:33'),
(89165, 'archive_plague_sibelonites_2', 'Plague of Sibelonites (2)', 'Destroy 75 Sibelonits to reduce the Sibelonit plague.', 'NPC Hunt', 0, 2250000, 5000, 150000, 0, 0, 0, 0, 0, 0, 1, 520, '2026-05-12 22:22:33'),
(89166, 'archive_plague_sibelonites_3', 'Plague of Sibelonites (3)', 'Destroy 150 Sibelonits to reduce the Sibelonit plague.', 'NPC Hunt', 0, 5000000, 10000, 250000, 0, 0, 0, 0, 0, 0, 1, 530, '2026-05-12 22:22:33'),
(89167, 'archive_plague_sibelonites_4', 'Plague of Sibelonites (4)', 'Destroy 225 Sibelonits to reduce the Sibelonit plague.', 'NPC Hunt', 0, 7500000, 30000, 400000, 0, 0, 0, 0, 0, 0, 1, 540, '2026-05-12 22:22:33'),
(89168, 'archive_plague_sibelonites_5', 'Plague of Sibelonites (5)', 'Destroy 300 Sibelonits to reduce the Sibelonit plague.', 'NPC Hunt', 0, 12000000, 50000, 600000, 0, 0, 0, 0, 0, 0, 1, 550, '2026-05-12 22:22:33'),
(89169, 'archive_mothership_1', 'Mothership (1)', 'Destroy 10 Lordakiums and weaken the enemy mothership line.', 'NPC Hunt', 0, 5000000, 2500, 100000, 0, 0, 0, 0, 0, 0, 1, 610, '2026-05-12 22:22:33'),
(89170, 'archive_mothership_2', 'Mothership (2)', 'Destroy 25 Lordakiums and weaken the enemy mothership line.', 'NPC Hunt', 0, 7500000, 5000, 175000, 0, 0, 0, 0, 0, 0, 1, 620, '2026-05-12 22:22:33'),
(89171, 'archive_mothership_3', 'Mothership (3)', 'Destroy 75 Lordakiums and weaken the enemy mothership line.', 'NPC Hunt', 0, 15000000, 12500, 250000, 0, 0, 0, 0, 0, 0, 1, 630, '2026-05-12 22:22:33'),
(89172, 'archive_mothership_4', 'Mothership (4)', 'Destroy 150 Lordakiums and weaken the enemy mothership line.', 'NPC Hunt', 0, 30000000, 30000, 400000, 0, 0, 0, 0, 0, 0, 1, 640, '2026-05-12 22:22:33'),
(89173, 'archive_decrystallization_1', 'Decrystallization (1)', 'Destroy 10 Kristallons in the crystal sectors.', 'NPC Hunt', 0, 7500000, 5000, 250000, 0, 0, 0, 0, 0, 0, 1, 710, '2026-05-12 22:22:33'),
(89174, 'archive_decrystallization_2', 'Decrystallization (2)', 'Destroy 25 Kristallons in the crystal sectors.', 'NPC Hunt', 0, 12500000, 7500, 500000, 0, 0, 0, 0, 0, 0, 1, 720, '2026-05-12 22:22:33'),
(89175, 'archive_decrystallization_3', 'Decrystallization (3)', 'Destroy 75 Kristallons in the crystal sectors.', 'NPC Hunt', 0, 25000000, 15000, 1000000, 0, 0, 0, 0, 0, 0, 1, 730, '2026-05-12 22:22:33'),
(89176, 'archive_decrystallization_4', 'Decrystallization (4)', 'Destroy 500 Kristallins in the crystal sectors.', 'NPC Hunt', 0, 30000000, 20000, 3000000, 0, 0, 0, 0, 0, 0, 1, 740, '2026-05-12 22:22:33'),
(89177, 'archive_decrystallization_5', 'Decrystallization (5)', 'Destroy 100 Kristallons in the crystal sectors.', 'NPC Hunt', 0, 40000000, 25000, 2000000, 0, 0, 0, 0, 0, 0, 1, 750, '2026-05-12 22:22:33'),
(89178, 'archive_decrystallization_6', 'Decrystallization (6)', 'Destroy 150 Kristallons in the crystal sectors.', 'NPC Hunt', 0, 60000000, 50000, 3000000, 0, 0, 0, 0, 0, 0, 1, 760, '2026-05-12 22:22:33'),
(89179, 'archive_streuner_invasion_1', 'StreuneR invasion (1)', 'Destroy 50 StreuneR aliens in the X-8 invasion sector.', 'NPC Hunt', 12, 500000, 500, 100000, 0, 0, 0, 0, 0, 0, 1, 910, '2026-05-12 22:22:33'),
(89180, 'archive_streuner_invasion_2', 'StreuneR invasion (2)', 'Destroy 150 StreuneR aliens in the X-8 invasion sector.', 'NPC Hunt', 12, 1500000, 750, 100000, 0, 0, 0, 0, 0, 0, 1, 920, '2026-05-12 22:22:33'),
(89181, 'archive_streuner_invasion_3', 'StreuneR invasion (3)', 'Destroy 300 StreuneR aliens in the X-8 invasion sector.', 'NPC Hunt', 12, 3000000, 1000, 100000, 0, 0, 0, 0, 0, 0, 1, 930, '2026-05-12 22:22:33'),
(89182, 'archive_streuner_invasion_4', 'StreuneR invasion (4)', 'Destroy 450 StreuneR aliens in the X-8 invasion sector.', 'NPC Hunt', 12, 4500000, 2000, 150000, 0, 0, 0, 0, 0, 0, 1, 940, '2026-05-12 22:22:33'),
(89183, 'archive_streuner_invasion_5', 'StreuneR invasion (5)', 'Destroy 600 StreuneR aliens in the X-8 invasion sector.', 'NPC Hunt', 12, 6000000, 4000, 250000, 0, 0, 0, 0, 0, 0, 1, 950, '2026-05-12 22:22:33'),
(89184, 'archive_resource_shortage', 'Resource shortage', 'Collect 300 Prometium for the company resource reserve.', 'Ore Collection', 0, 500000, 1000, 750000, 0, 0, 0, 0, 0, 0, 1, 310, '2026-05-12 22:22:33'),
(89185, 'archive_scroungers_delight', 'Scrounger\'s delight', 'Collect 200 Terbium for the company resource reserve.', 'Ore Collection', 0, 8000000, 5000, 1000000, 0, 0, 0, 0, 0, 0, 1, 370, '2026-05-12 22:22:33'),
(89186, 'archive_steal_resources_1', 'Steal resources (1)', 'Collect 200 Prometium for a classic resource operation.', 'Ore Collection', 0, 2500000, 4000, 100000, 0, 0, 0, 0, 0, 0, 1, 320, '2026-05-12 22:22:33'),
(89187, 'archive_steal_resources_2', 'Steal resources (2)', 'Collect 220 Endurium for a classic resource operation.', 'Ore Collection', 0, 2700000, 5000, 120000, 0, 0, 0, 0, 0, 0, 1, 330, '2026-05-12 22:22:33'),
(89188, 'archive_steal_resources_3', 'Steal resources (3)', 'Collect 240 Terbium for a classic resource operation.', 'Ore Collection', 0, 3000000, 6000, 140000, 0, 0, 0, 0, 0, 0, 1, 340, '2026-05-12 22:22:33'),
(89189, 'archive_steal_resources_4', 'Steal resources (4)', 'Collect 300 Terbium for a classic resource operation.', 'Ore Collection', 0, 4500000, 8000, 200000, 0, 0, 0, 0, 0, 0, 1, 350, '2026-05-12 22:22:33'),
(89190, 'archive_steal_resources_5', 'Steal resources (5)', 'Collect 400 Terbium for a classic resource operation.', 'Ore Collection', 0, 6000000, 12000, 500000, 0, 0, 0, 0, 0, 0, 1, 360, '2026-05-12 22:22:33');

-- --------------------------------------------------------

--
-- Structure de la table `site_quest_objectives`
--

CREATE TABLE `site_quest_objectives` (
  `id` int(11) NOT NULL,
  `quest_id` int(11) NOT NULL,
  `objective_type` varchar(32) NOT NULL,
  `target_key` varchar(64) NOT NULL,
  `required_amount` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_quest_objectives`
--

INSERT INTO `site_quest_objectives` (`id`, `quest_id`, `objective_type`, `target_key`, `required_amount`, `sort_order`) VALUES
(94345, 1, 'ore_have', 'Prometium', 8, 10),
(94346, 1, 'npc_kill', 'Streuner', 6, 20),
(94347, 2, 'ore_have', 'Prometium', 20, 10),
(94348, 3, 'ore_have', 'Prometium', 40, 10),
(94349, 4, 'ore_have', 'Prometium', 80, 10),
(94350, 5, 'ore_have', 'Endurium', 30, 10),
(94351, 6, 'ore_have', 'Endurium', 60, 10),
(94352, 7, 'ore_have', 'Endurium', 120, 10),
(94353, 8, 'ore_have', 'Terbium', 40, 10),
(94354, 9, 'ore_have', 'Terbium', 80, 10),
(94355, 10, 'npc_kill', 'Streuner', 5, 10),
(94356, 11, 'npc_kill', 'Streuner', 10, 10),
(94357, 12, 'npc_kill', 'Streuner', 20, 10),
(94358, 13, 'npc_kill', 'Lordakia', 10, 10),
(94359, 14, 'npc_kill', 'Lordakia', 20, 10),
(94360, 15, 'npc_kill', 'Lordakia', 40, 10),
(94361, 16, 'npc_kill', 'Mordon', 10, 10),
(94362, 17, 'npc_kill', 'Mordon', 20, 10),
(94363, 18, 'npc_kill', 'Devolarium', 3, 10),
(94364, 19, 'npc_kill', 'Saimon', 20, 10),
(94365, 20, 'npc_kill', 'Saimon', 40, 10),
(94366, 89104, 'npc_kill', 'Devolarium', 1, 10),
(94367, 89105, 'npc_kill', 'Saimon', 3, 10),
(94368, 89105, 'npc_kill', 'Devolarium', 1, 20),
(94369, 89105, 'npc_kill', 'Mordon', 1, 30),
(94370, 89106, 'npc_kill', 'Lordakia', 10, 10),
(94371, 89106, 'npc_kill', 'Devolarium', 2, 20),
(94372, 89107, 'npc_kill', 'Streuner', 1, 10),
(94373, 89107, 'npc_kill', 'Lordakia', 1, 20),
(94374, 89107, 'npc_kill', 'Saimon', 1, 30),
(94375, 89107, 'npc_kill', 'Mordon', 1, 40),
(94376, 89107, 'npc_kill', 'Devolarium', 1, 50),
(94377, 89107, 'npc_kill', 'Sibelon', 1, 60),
(94378, 89107, 'npc_kill', 'Sibelonit', 1, 70),
(94379, 89107, 'npc_kill', 'Lordakium', 1, 80),
(94380, 89107, 'npc_kill', 'Kristallin', 1, 90),
(94381, 89107, 'npc_kill', 'Kristallon', 1, 100),
(94382, 89107, 'npc_kill', 'Cubikon', 1, 110),
(94383, 89108, 'npc_kill', 'Sibelonit', 10, 10),
(94384, 89108, 'npc_kill', 'Sibelon', 3, 20),
(94385, 89109, 'npc_kill', 'Lordakium', 5, 10),
(94386, 89110, 'npc_kill', 'Kristallin', 20, 10),
(94387, 89110, 'npc_kill', 'Kristallon', 5, 20),
(94388, 89111, 'npc_kill', 'Cubikon', 1, 10),
(94389, 89112, 'npc_kill', 'StreuneR_X8', 25, 10),
(94390, 89113, 'npc_kill', 'Streuner', 15, 10),
(94391, 89113, 'npc_kill', 'Lordakia', 15, 20),
(94392, 89113, 'npc_kill', 'Saimon', 10, 30),
(94393, 89113, 'npc_kill', 'Mordon', 5, 40),
(94394, 89184, 'ore_have', 'Prometium', 300, 10),
(94395, 89186, 'ore_have', 'Prometium', 200, 10),
(94396, 89187, 'ore_have', 'Endurium', 220, 10),
(94397, 89188, 'ore_have', 'Terbium', 240, 10),
(94398, 89189, 'ore_have', 'Terbium', 300, 10),
(94399, 89190, 'ore_have', 'Terbium', 400, 10),
(94400, 89185, 'ore_have', 'Terbium', 200, 10),
(94401, 89159, 'npc_kill', 'Sibelon', 2, 10),
(94402, 89160, 'npc_kill', 'Sibelon', 4, 10),
(94403, 89161, 'npc_kill', 'Sibelon', 8, 10),
(94404, 89162, 'npc_kill', 'Sibelon', 200, 10),
(94405, 89164, 'npc_kill', 'Sibelonit', 25, 10),
(94406, 89165, 'npc_kill', 'Sibelonit', 75, 10),
(94407, 89166, 'npc_kill', 'Sibelonit', 150, 10),
(94408, 89167, 'npc_kill', 'Sibelonit', 225, 10),
(94409, 89168, 'npc_kill', 'Sibelonit', 300, 10),
(94410, 89169, 'npc_kill', 'Lordakium', 10, 10),
(94411, 89170, 'npc_kill', 'Lordakium', 25, 10),
(94412, 89171, 'npc_kill', 'Lordakium', 75, 10),
(94413, 89172, 'npc_kill', 'Lordakium', 150, 10),
(94414, 89173, 'npc_kill', 'Kristallon', 10, 10),
(94415, 89174, 'npc_kill', 'Kristallon', 25, 10),
(94416, 89175, 'npc_kill', 'Kristallon', 75, 10),
(94417, 89176, 'npc_kill', 'Kristallin', 500, 10),
(94418, 89177, 'npc_kill', 'Kristallon', 100, 10),
(94419, 89178, 'npc_kill', 'Kristallon', 150, 10),
(94420, 89163, 'npc_kill', 'Cubikon', 10, 10),
(94421, 89179, 'npc_kill', 'StreuneR_X8', 50, 10),
(94422, 89180, 'npc_kill', 'StreuneR_X8', 150, 10),
(94423, 89181, 'npc_kill', 'StreuneR_X8', 300, 10),
(94424, 89182, 'npc_kill', 'StreuneR_X8', 450, 10),
(94425, 89183, 'npc_kill', 'StreuneR_X8', 600, 10),
(94426, 581, 'player_kill', 'user_kill', 1, 10),
(94427, 582, 'player_kill', 'user_kill', 3, 10),
(94428, 583, 'player_kill', 'user_kill', 5, 10),
(94429, 584, 'player_kill', 'user_kill', 10, 10),
(94430, 585, 'player_kill', 'user_kill', 25, 10),
(94431, 586, 'player_kill', 'user_kill', 50, 10),
(94432, 587, 'player_kill', 'user_kill', 100, 10),
(94433, 85611, 'npc_kill', 'Cubikon', 100, 10),
(94434, 85612, 'galaxy_gate_complete', 'Delta', 10, 10),
(94435, 85613, 'galaxy_gate_complete', 'Beta', 10, 10),
(94436, 85614, 'galaxy_gate_complete', 'Alpha', 10, 10),
(94437, 85615, 'galaxy_gate_complete', 'Gamma', 5, 10),
(94438, 85616, 'npc_kill', 'Kristallon', 500, 10),
(94439, 85617, 'npc_kill', 'StreuneR_X8', 400, 10),
(94440, 85618, 'npc_kill', 'Lordakium', 650, 10);

-- --------------------------------------------------------

--
-- Structure de la table `site_quest_ore_counts`
--

CREATE TABLE `site_quest_ore_counts` (
  `player_id` int(11) NOT NULL,
  `prometium` bigint(20) NOT NULL DEFAULT 0,
  `endurium` bigint(20) NOT NULL DEFAULT 0,
  `terbium` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_quest_ore_counts`
--

INSERT INTO `site_quest_ore_counts` (`player_id`, `prometium`, `endurium`, `terbium`, `updated_at`) VALUES
(1, 60688, 57286, 56233, '2026-06-12 19:11:42'),
(3, 20, 20, 0, '2026-05-30 23:44:14');

-- --------------------------------------------------------

--
-- Structure de la table `site_weekly_missions`
--

CREATE TABLE `site_weekly_missions` (
  `id` int(11) NOT NULL,
  `code` varchar(64) NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `rotation_group` char(1) NOT NULL,
  `slot` tinyint(4) NOT NULL,
  `difficulty` varchar(32) NOT NULL DEFAULT 'Hard',
  `recommended_level` int(11) NOT NULL DEFAULT 12,
  `reward_uridium` bigint(20) NOT NULL DEFAULT 0,
  `reward_experience` bigint(20) NOT NULL DEFAULT 0,
  `reward_honor` bigint(20) NOT NULL DEFAULT 0,
  `reward_ucb100` bigint(20) NOT NULL DEFAULT 0,
  `reward_rsb75` bigint(20) NOT NULL DEFAULT 0,
  `reward_seprom` bigint(20) NOT NULL DEFAULT 0,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_weekly_missions`
--

INSERT INTO `site_weekly_missions` (`id`, `code`, `title`, `description`, `rotation_group`, `slot`, `difficulty`, `recommended_level`, `reward_uridium`, `reward_experience`, `reward_honor`, `reward_ucb100`, `reward_rsb75`, `reward_seprom`, `enabled`, `updated_at`) VALUES
(1, 'weekly_sector_cleanup', 'Sector Cleanup', 'Clean up the lower sectors by destroying classic alien forces.', 'A', 1, 'Hard', 8, 30000, 4000000, 20000, 35000, 10000, 1000, 1, '2026-06-01 15:52:43'),
(2, 'weekly_heavy_alien_hunt', 'Heavy Alien Hunt', 'Hunt stronger aliens across dangerous sectors.', 'A', 2, 'Very Hard', 12, 45000, 8000000, 40000, 45000, 20000, 2000, 1, '2026-06-01 15:52:43'),
(3, 'weekly_operation_45', 'Operation 4-5', 'Enter 4-5 and destroy Uber alien forces.', 'A', 3, 'Extreme', 14, 45000, 10000000, 50000, 50000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(4, 'weekly_boss_cubikon_suppression', 'Boss Cubikon Suppression', 'Suppress the Boss Cubikon presence in 4-5.', 'A', 4, 'Extreme', 15, 45000, 12000000, 60000, 45000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(5, 'weekly_enemy_hunter', 'Enemy Hunter Weekly', 'Destroy eligible enemy pilots from another company.', 'A', 5, 'PvP', 8, 35000, 6000000, 50000, 25000, 15000, 1000, 1, '2026-06-01 15:52:43'),
(6, 'weekly_lower_maps_lockdown', 'Lower Maps Lockdown', 'Lock down the lower maps by destroying large classic alien groups.', 'B', 1, 'Hard', 8, 30000, 4000000, 20000, 35000, 10000, 1000, 1, '2026-06-01 15:52:43'),
(7, 'weekly_crystal_front', 'Crystal Front', 'Push through the crystal alien front.', 'B', 2, 'Very Hard', 12, 45000, 8000000, 40000, 45000, 20000, 2000, 1, '2026-06-01 15:52:43'),
(8, 'weekly_uber_vanguard', 'Uber Vanguard', 'Break the Uber alien vanguard in 4-5.', 'B', 3, 'Extreme', 14, 45000, 10000000, 50000, 50000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(9, 'weekly_boss_hive_control', 'Boss Hive Control', 'Control the Boss Cubikon hive in 4-5.', 'B', 4, 'Extreme', 15, 45000, 12000000, 60000, 45000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(10, 'weekly_enemy_ace_hunt', 'Enemy Ace Hunt', 'Destroy eligible enemy pilots from another company.', 'B', 5, 'PvP', 8, 35000, 6000000, 50000, 25000, 15000, 1000, 1, '2026-06-01 15:52:43'),
(11, 'weekly_outer_sector_purge', 'Outer Sector Purge', 'Purge hostile alien forces from the outer sectors.', 'C', 1, 'Hard', 10, 30000, 4000000, 20000, 35000, 10000, 1000, 1, '2026-06-01 15:52:43'),
(12, 'weekly_titan_hunt', 'Titan Hunt', 'Destroy the toughest classic alien targets.', 'C', 2, 'Very Hard', 12, 45000, 8000000, 40000, 45000, 20000, 2000, 1, '2026-06-01 15:52:43'),
(13, 'weekly_uber_endurance_45', 'Uber Endurance 4-5', 'Survive a long 4-5 Uber alien hunt.', 'C', 3, 'Extreme', 14, 45000, 10000000, 50000, 50000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(14, 'weekly_boss_convoy_breaker', 'Boss Convoy Breaker', 'Break Boss Cubikon convoys in 4-5.', 'C', 4, 'Extreme', 15, 45000, 12000000, 60000, 45000, 20000, 2500, 1, '2026-06-01 15:52:43'),
(15, 'weekly_pvp_war_effort', 'PvP War Effort', 'Destroy eligible enemy pilots from another company.', 'C', 5, 'PvP', 8, 35000, 6000000, 50000, 25000, 15000, 1000, 1, '2026-06-01 15:52:43');

-- --------------------------------------------------------

--
-- Structure de la table `site_weekly_mission_objectives`
--

CREATE TABLE `site_weekly_mission_objectives` (
  `id` int(11) NOT NULL,
  `mission_id` int(11) NOT NULL,
  `objective_type` varchar(32) NOT NULL,
  `target_key` varchar(96) NOT NULL,
  `objective_label` varchar(220) NOT NULL,
  `required_amount` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `site_weekly_mission_objectives`
--

INSERT INTO `site_weekly_mission_objectives` (`id`, `mission_id`, `objective_type`, `target_key`, `objective_label`, `required_amount`, `sort_order`) VALUES
(54, 1, 'weekly_npc_kill', '0:Streuner', 'Destroy 300 Streuner', 300, 10),
(55, 1, 'weekly_npc_kill', '0:Lordakia', 'Destroy 250 Lordakia', 250, 20),
(56, 1, 'weekly_npc_kill', '0:Saimon', 'Destroy 180 Saimon', 180, 30),
(57, 1, 'weekly_npc_kill', '0:Mordon', 'Destroy 80 Mordon', 80, 40),
(58, 1, 'weekly_npc_kill', '0:Devolarium', 'Destroy 35 Devolarium', 35, 50),
(59, 2, 'weekly_npc_kill', '0:Sibelonit', 'Destroy 120 Sibelonit', 120, 10),
(60, 2, 'weekly_npc_kill', '0:Sibelon', 'Destroy 60 Sibelon', 60, 20),
(61, 2, 'weekly_npc_kill', '0:Kristallin', 'Destroy 80 Kristallin', 80, 30),
(62, 2, 'weekly_npc_kill', '0:Lordakium', 'Destroy 25 Lordakium', 25, 40),
(63, 2, 'weekly_npc_kill', '0:Kristallon', 'Destroy 20 Kristallon', 20, 50),
(64, 3, 'weekly_npc_kill', '29:Uber Saimon', 'Destroy 40 Uber Saimon in 4-5', 40, 10),
(65, 3, 'weekly_npc_kill', '29:Uber Mordon', 'Destroy 35 Uber Mordon in 4-5', 35, 20),
(66, 3, 'weekly_npc_kill', '29:Uber Sibelonit', 'Destroy 25 Uber Sibelonit in 4-5', 25, 30),
(67, 3, 'weekly_npc_kill', '29:Uber Devolarium', 'Destroy 20 Uber Devolarium in 4-5', 20, 40),
(68, 3, 'weekly_npc_kill', '29:Uber Lordakium', 'Destroy 15 Uber Lordakium in 4-5', 15, 50),
(69, 3, 'weekly_npc_kill', '29:Uber Kristallon', 'Destroy 10 Uber Kristallon in 4-5', 10, 60),
(70, 4, 'weekly_npc_kill', '29:Boss Cubikon', 'Destroy 8 Boss Cubikon in 4-5', 8, 10),
(71, 4, 'weekly_npc_kill', '29:Boss Protegit', 'Destroy 180 Boss Protegit in 4-5', 180, 20),
(72, 5, 'weekly_player_kill', 'eligible_enemy_pilot', 'Destroy 25 eligible enemy pilots', 25, 10),
(73, 6, 'weekly_npc_kill', '0:Streuner', 'Destroy 450 Streuner', 450, 10),
(74, 6, 'weekly_npc_kill', '0:Lordakia', 'Destroy 320 Lordakia', 320, 20),
(75, 6, 'weekly_npc_kill', '0:Saimon', 'Destroy 220 Saimon', 220, 30),
(76, 6, 'weekly_npc_kill', '0:Mordon', 'Destroy 120 Mordon', 120, 40),
(77, 7, 'weekly_npc_kill', '0:Kristallin', 'Destroy 180 Kristallin', 180, 10),
(78, 7, 'weekly_npc_kill', '0:Kristallon', 'Destroy 45 Kristallon', 45, 20),
(79, 7, 'weekly_npc_kill', '0:Sibelonit', 'Destroy 80 Sibelonit', 80, 30),
(80, 7, 'weekly_npc_kill', '0:Lordakium', 'Destroy 35 Lordakium', 35, 40),
(81, 8, 'weekly_npc_kill', '29:Uber Streuner', 'Destroy 60 Uber Streuner in 4-5', 60, 10),
(82, 8, 'weekly_npc_kill', '29:Uber Lordakia', 'Destroy 60 Uber Lordakia in 4-5', 60, 20),
(83, 8, 'weekly_npc_kill', '29:Uber Saimon', 'Destroy 45 Uber Saimon in 4-5', 45, 30),
(84, 8, 'weekly_npc_kill', '29:Uber Mordon', 'Destroy 30 Uber Mordon in 4-5', 30, 40),
(85, 8, 'weekly_npc_kill', '29:Uber Kristallin', 'Destroy 25 Uber Kristallin in 4-5', 25, 50),
(86, 8, 'weekly_npc_kill', '29:Uber Sibelon', 'Destroy 15 Uber Sibelon in 4-5', 15, 60),
(87, 9, 'weekly_npc_kill', '29:Boss Cubikon', 'Destroy 6 Boss Cubikon in 4-5', 6, 10),
(88, 9, 'weekly_npc_kill', '29:Boss Protegit', 'Destroy 220 Boss Protegit in 4-5', 220, 20),
(89, 10, 'weekly_player_kill', 'eligible_enemy_pilot', 'Destroy 20 eligible enemy pilots', 20, 10),
(90, 11, 'weekly_npc_kill', '0:Saimon', 'Destroy 150 Saimon', 150, 10),
(91, 11, 'weekly_npc_kill', '0:Mordon', 'Destroy 100 Mordon', 100, 20),
(92, 11, 'weekly_npc_kill', '0:Devolarium', 'Destroy 60 Devolarium', 60, 30),
(93, 11, 'weekly_npc_kill', '0:Sibelonit', 'Destroy 100 Sibelonit', 100, 40),
(94, 12, 'weekly_npc_kill', '0:Sibelon', 'Destroy 85 Sibelon', 85, 10),
(95, 12, 'weekly_npc_kill', '0:Lordakium', 'Destroy 40 Lordakium', 40, 20),
(96, 12, 'weekly_npc_kill', '0:Kristallon', 'Destroy 35 Kristallon', 35, 30),
(97, 12, 'weekly_npc_kill', '0:Kristallin', 'Destroy 220 Kristallin', 220, 40),
(98, 13, 'weekly_npc_kill', '29:Uber Streuner', 'Destroy 80 Uber Streuner in 4-5', 80, 10),
(99, 13, 'weekly_npc_kill', '29:Uber Lordakia', 'Destroy 50 Uber Lordakia in 4-5', 50, 20),
(100, 13, 'weekly_npc_kill', '29:Uber Devolarium', 'Destroy 35 Uber Devolarium in 4-5', 35, 30),
(101, 13, 'weekly_npc_kill', '29:Uber Lordakium', 'Destroy 25 Uber Lordakium in 4-5', 25, 40),
(102, 13, 'weekly_npc_kill', '29:Uber Kristallon', 'Destroy 20 Uber Kristallon in 4-5', 20, 50),
(103, 13, 'weekly_npc_kill', '29:Uber StreuneR', 'Destroy 20 Uber StreuneR in 4-5', 20, 60),
(104, 14, 'weekly_npc_kill', '29:Boss Cubikon', 'Destroy 10 Boss Cubikon in 4-5', 10, 10),
(105, 14, 'weekly_npc_kill', '29:Boss Protegit', 'Destroy 150 Boss Protegit in 4-5', 150, 20),
(106, 15, 'weekly_player_kill', 'eligible_enemy_pilot', 'Destroy 25 eligible enemy pilots', 25, 10);

-- --------------------------------------------------------

--
-- Structure de la table `speedhack_detect`
--

CREATE TABLE `speedhack_detect` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `title_runtime_state`
--

CREATE TABLE `title_runtime_state` (
  `state_key` varchar(64) NOT NULL,
  `title_key` varchar(32) NOT NULL,
  `holder_type` enum('none','npc','player') NOT NULL DEFAULT 'none',
  `holder_player_id` int(11) NOT NULL DEFAULT 0,
  `holder_npc_id` int(11) NOT NULL DEFAULT 0,
  `holder_map_id` int(11) NOT NULL DEFAULT 0,
  `assigned_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `title_runtime_state`
--

INSERT INTO `title_runtime_state` (`state_key`, `title_key`, `holder_type`, `holder_player_id`, `holder_npc_id`, `holder_map_id`, `assigned_at`, `expires_at`, `updated_at`) VALUES
('most_wanted', 'title_14', 'npc', 0, -768, 29, '2026-06-12 19:47:37', NULL, '2026-06-12 21:47:37');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `sid` int(11) NOT NULL,
  `username` varchar(110) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_title` varchar(30) NOT NULL,
  `password` varchar(64) NOT NULL,
  `email` varchar(50) NOT NULL,
  `birthday` varchar(30) NOT NULL,
  `AuthTicket` varchar(255) NOT NULL,
  `ip` varchar(15) NOT NULL,
  `online` tinyint(1) NOT NULL DEFAULT 0,
  `oldlocx` int(11) NOT NULL,
  `oldlocy` int(11) NOT NULL,
  `locx` int(11) NOT NULL DEFAULT 12000,
  `locy` int(11) NOT NULL DEFAULT 6000,
  `mapid` int(11) NOT NULL DEFAULT 2,
  `shipid` int(11) NOT NULL DEFAULT 1,
  `grade` int(11) NOT NULL DEFAULT 1,
  `factionid` int(11) NOT NULL DEFAULT 0,
  `clanid` int(11) NOT NULL DEFAULT 0,
  `clan_grade` int(11) NOT NULL DEFAULT 0,
  `registerdate` timestamp NOT NULL DEFAULT current_timestamp(),
  `lastlogin` double NOT NULL,
  `credits` bigint(20) NOT NULL DEFAULT 20000,
  `uridium` bigint(20) NOT NULL DEFAULT 10000,
  `speed` int(11) NOT NULL DEFAULT 380,
  `current_shield` int(11) NOT NULL DEFAULT 0,
  `max_shield` int(11) NOT NULL DEFAULT 10000,
  `current_hp` int(11) NOT NULL DEFAULT 4000,
  `max_hp` int(11) NOT NULL DEFAULT 100000,
  `current_cargo` int(11) NOT NULL DEFAULT 0,
  `max_cargo` int(11) NOT NULL DEFAULT 100,
  `in_peacezone` int(11) NOT NULL DEFAULT 0,
  `in_fight` int(11) NOT NULL DEFAULT 0,
  `in_outofrange` int(11) NOT NULL DEFAULT 0,
  `in_warningzone` int(11) NOT NULL DEFAULT 0,
  `connID` int(11) NOT NULL DEFAULT 0,
  `FightThreadID` int(11) NOT NULL,
  `SelectedPlayer` int(11) NOT NULL DEFAULT 0,
  `user_kill` int(11) NOT NULL DEFAULT 0,
  `kill_assists` int(11) NOT NULL DEFAULT 0,
  `isDestroy` tinyint(1) NOT NULL DEFAULT 0,
  `active_config` int(11) NOT NULL DEFAULT 1,
  `cooldown_ISH` int(11) NOT NULL DEFAULT 0,
  `cooldown_SMB` int(11) NOT NULL DEFAULT 0,
  `cooldown_ROCKET` int(11) NOT NULL DEFAULT 0,
  `auto_logout` tinyint(4) NOT NULL DEFAULT 0,
  `is_ban` tinyint(1) NOT NULL DEFAULT 0,
  `ban_reason` varchar(255) NOT NULL,
  `game_resolution` tinyint(4) NOT NULL DEFAULT 1,
  `is_mod` tinyint(1) NOT NULL DEFAULT 0,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `fat_lasers` int(11) NOT NULL,
  `shield_mechanics` int(11) NOT NULL,
  `drones` varchar(255) NOT NULL DEFAULT '',
  `damages` int(11) NOT NULL DEFAULT 1500,
  `npc_kill` int(11) NOT NULL DEFAULT 0,
  `pvp_points` int(11) NOT NULL DEFAULT 0,
  `experience` bigint(20) NOT NULL DEFAULT 0,
  `honor` bigint(20) NOT NULL DEFAULT 0,
  `level` int(11) NOT NULL DEFAULT 1,
  `dmg_lvl` int(5) NOT NULL DEFAULT 0,
  `hp_lvl` int(5) NOT NULL DEFAULT 0,
  `shd_lvl` int(5) NOT NULL DEFAULT 0,
  `speed_lvl` int(2) NOT NULL DEFAULT 0,
  `booster_dmg_time` int(11) NOT NULL,
  `booster_hp_time` int(11) NOT NULL DEFAULT 0,
  `booster_shd_time` int(11) NOT NULL,
  `booster_npc_time` int(11) NOT NULL,
  `booster_spd_time` int(11) NOT NULL DEFAULT 0,
  `booty_keys` int(11) NOT NULL DEFAULT 0,
  `drone_parts` int(11) NOT NULL DEFAULT 0,
  `apis_built` tinyint(1) NOT NULL DEFAULT 0,
  `zeus_built` tinyint(1) NOT NULL DEFAULT 0,
  `skilltree` varchar(255) NOT NULL DEFAULT 'dmg:0/hp:0/rep:0/shd_abs:0/smb:0/rck:0/shreg:0',
  `logfiles` int(11) NOT NULL DEFAULT 0,
  `rankpoints` bigint(64) NOT NULL DEFAULT 0,
  `message` text NOT NULL COMMENT 'A message that will be displayed to the user on the CMS if not null',
  `display_ads` tinyint(1) NOT NULL DEFAULT 1,
  `auto_rkt_skill` int(11) NOT NULL DEFAULT 0,
  `auto_rocketlauncher_skill` int(11) NOT NULL DEFAULT 0,
  `selected_launcher_rocket` int(11) NOT NULL DEFAULT 7,
  `legend_rankpoints` int(11) DEFAULT 0,
  `canBeginner` int(11) NOT NULL DEFAULT 1,
  `extra_booster` varchar(50) NOT NULL DEFAULT 'nothing',
  `last_duel` int(11) NOT NULL DEFAULT 0,
  `in_fight_until` int(11) NOT NULL DEFAULT 0,
  `ammo_lcb10` bigint(20) NOT NULL DEFAULT 10000,
  `ammo_mcb25` bigint(20) NOT NULL DEFAULT 5000,
  `ammo_mcb50` bigint(20) NOT NULL DEFAULT 3000,
  `ammo_ucb100` bigint(20) NOT NULL DEFAULT 1500,
  `ammo_sab50` bigint(20) NOT NULL DEFAULT 3000,
  `ammo_rsb75` bigint(20) NOT NULL DEFAULT 0,
  `ammo_r310` bigint(20) NOT NULL DEFAULT 500,
  `ammo_plt2026` bigint(20) NOT NULL DEFAULT 300,
  `ammo_plt2021` bigint(20) NOT NULL DEFAULT 100,
  `ammo_dcr250` bigint(20) NOT NULL DEFAULT 0,
  `ammo_eco10` int(11) NOT NULL DEFAULT 0,
  `ammo_ubr100` int(11) NOT NULL DEFAULT 0,
  `ammo_hstrm01` int(11) NOT NULL DEFAULT 0,
  `gg_multiplier` tinyint(1) DEFAULT 0,
  `gg_rings` int(11) NOT NULL DEFAULT 0,
  `ammo_smb01` int(11) NOT NULL DEFAULT 0,
  `ammo_ish01` int(11) NOT NULL DEFAULT 0,
  `ammo_emp01` int(11) NOT NULL DEFAULT 0,
  `config_refresh_pending` tinyint(1) NOT NULL DEFAULT 0,
  `cooldown_IH` int(11) NOT NULL DEFAULT 0,
  `cooldown_WS` int(11) NOT NULL DEFAULT 0,
  `cooldown_PS` int(11) NOT NULL DEFAULT 0,
  `cooldown_FOR` int(11) NOT NULL DEFAULT 0,
  `cooldown_SIN` int(11) NOT NULL DEFAULT 0,
  `cooldown_SB` int(11) NOT NULL DEFAULT 0,
  `current_shield1` int(11) DEFAULT NULL,
  `current_shield2` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `sid`, `username`, `game_title`, `password`, `email`, `birthday`, `AuthTicket`, `ip`, `online`, `oldlocx`, `oldlocy`, `locx`, `locy`, `mapid`, `shipid`, `grade`, `factionid`, `clanid`, `clan_grade`, `registerdate`, `lastlogin`, `credits`, `uridium`, `speed`, `current_shield`, `max_shield`, `current_hp`, `max_hp`, `current_cargo`, `max_cargo`, `in_peacezone`, `in_fight`, `in_outofrange`, `in_warningzone`, `connID`, `FightThreadID`, `SelectedPlayer`, `user_kill`, `kill_assists`, `isDestroy`, `active_config`, `cooldown_ISH`, `cooldown_SMB`, `cooldown_ROCKET`, `auto_logout`, `is_ban`, `ban_reason`, `game_resolution`, `is_mod`, `is_admin`, `fat_lasers`, `shield_mechanics`, `drones`, `damages`, `npc_kill`, `pvp_points`, `experience`, `honor`, `level`, `dmg_lvl`, `hp_lvl`, `shd_lvl`, `speed_lvl`, `booster_dmg_time`, `booster_hp_time`, `booster_shd_time`, `booster_npc_time`, `booster_spd_time`, `booty_keys`, `drone_parts`, `apis_built`, `zeus_built`, `skilltree`, `logfiles`, `rankpoints`, `message`, `display_ads`, `auto_rkt_skill`, `auto_rocketlauncher_skill`, `selected_launcher_rocket`, `legend_rankpoints`, `canBeginner`, `extra_booster`, `last_duel`, `in_fight_until`, `ammo_lcb10`, `ammo_mcb25`, `ammo_mcb50`, `ammo_ucb100`, `ammo_sab50`, `ammo_rsb75`, `ammo_r310`, `ammo_plt2026`, `ammo_plt2021`, `ammo_dcr250`, `ammo_eco10`, `ammo_ubr100`, `ammo_hstrm01`, `gg_multiplier`, `gg_rings`, `ammo_smb01`, `ammo_ish01`, `ammo_emp01`, `config_refresh_pending`, `cooldown_IH`, `cooldown_WS`, `cooldown_PS`, `cooldown_FOR`, `cooldown_SIN`, `cooldown_SB`, `current_shield1`, `current_shield2`) VALUES
(1, 0, 'lefaucheur', 'title_402', '', '', '', '', '127.0.0.1', 1, 0, 0, 5717, 2798, 4, 18, 23, 1, 0, 0, '2026-04-04 16:54:05', 1781293634.9635339, 2527973654, 9046108, 380, 0, 120000, 109216, 230000, 0, 100, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 0, 0, 0, 0, 0, '', 1, 0, 1, 0, 0, '3/0-3/0-3/0-3/0-3/0-3/0-3/0', 3552, 29344, 0, 635274700, 547026, 17, 0, 10, 0, 0, 1780273184, 1780283985, 1780269587, 0, 0, 0, 0, 0, 0, 'dmg:5/hp:0/rep:3/shd_abs:3/smb:0/rck:0/shreg:0', 1007, 135383, '', 1, 1, 1, 7, 0, 0, 'nothing', 0, 1781293659, 2268, 606019, 257492, 769288, 193902, 450408, 262, 6458, 249, 1871, 0, 0, 863, 0, 4, 36, 94, 130, 0, 0, 0, 0, 0, 0, 355, 60000, 120000),
(2, 0, 'lefaucheur1', '', '', '', '', 'c38cf60fc9ea6fac08ffbfbbe3aea4bf4c88c858', '127.0.0.1', 0, 0, 0, 13611, 11215, 2, 1, 20, 1, 0, 0, '2026-04-06 08:53:43', 1775784058.1036468, 80224, 10150, 380, 0, 10000, 4000, 4000, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, '', 1, 0, 0, 0, 0, '', 1500, 36, 0, 20000, 100, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'dmg:0/hp:0/rep:0/shd_abs:0/smb:0/rck:0/shreg:0', 0, 36, '', 1, 0, 0, 7, 0, 1, 'nothing', 0, 1775784104, 9478, 5000, 3000, 1500, 3000, 0, 500, 300, 71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL),
(3, 0, 'RΘCINΔNTΣ', 'title_5', '', '', '', '', '127.0.0.1', 0, 0, 0, 15636, 8707, 1, 1, 19, 1, 0, 0, '2026-04-06 11:28:21', 1781283947.5008154, 2722172, 32804, 380, 0, 10000, 4000, 4000, 0, 100, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, '', 1, 0, 0, 0, 0, '', 1500, 65, 0, 81000, 661, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'dmg:0/hp:0/rep:0/shd_abs:0/smb:0/rck:0/shreg:0', 0, 65, '', 1, 0, 0, 7, 0, 1, 'nothing', 0, 1780177458, 12362, 16516, 3000, 6, 1290, 0, 435, 280, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 0, 'test12345', '', '', '', '', '', '127.0.0.1', 0, 0, 0, 7388, 5721, 1, 10, 18, 1, 0, 0, '2026-04-08 16:40:03', 1776630123.672668, 21749, 273003, 380, 0, 10000, 255527, 256000, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, '', 1, 0, 0, 0, 0, '3/0-3/0-3/0-3/0-3/0-3/0-3/0-3/0', 1500, 1, 0, 400, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'dmg:0/hp:0/rep:0/shd_abs:0/smb:0/rck:0/shreg:0', 0, 1, '', 1, 0, 0, 7, 0, 1, 'nothing', 0, 1776608357, 9946, 5000, 3005, 708, 3000, 0, 500, 300, 99, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `users_infos`
--

CREATE TABLE `users_infos` (
  `id` int(64) NOT NULL,
  `login` varchar(110) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(64) NOT NULL,
  `email` varchar(64) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `registerdate` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `tokens` int(11) NOT NULL DEFAULT 0,
  `freeName` int(11) NOT NULL DEFAULT 2,
  `tickets` int(11) NOT NULL DEFAULT 0,
  `key` varchar(64) NOT NULL DEFAULT 'blank'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users_infos`
--

INSERT INTO `users_infos` (`id`, `login`, `password`, `email`, `is_verified`, `registerdate`, `is_admin`, `tokens`, `freeName`, `tickets`, `key`) VALUES
(1, 'lefaucheur', '$2y$10$eAoCdP5QRqcYwLLMjMNtoOhrJAezF1e0WTe0ZUlZsM/ccAseaodyC', 'lefaucheur@yopmail.com', 1, '2026-04-04 16:54:06', 0, 0, 2, 0, 'aimOsWEelH4QiOO0'),
(2, 'lefaucheur1', '$2y$10$f/0lnPmd5OnwwIwUY3AdIuxRHiC37nFipIJx9T0Koqzx2rgc1JV96', 'lefaucheur1@hotmail.com', 1, '2026-04-06 08:53:43', 0, 0, 2, 0, 'Sq4jd8RvWD79OYUT'),
(3, 'lefaucheur2', '$2y$10$R8cZPq.QOmhsoE7yOhKXnOjIjjcMcjHN.nEBFV2VItKIuiHjrqaA6', 'lefaucheur2@hotmail.com', 1, '2026-04-06 11:28:21', 0, 0, 2, 0, 'CCPUfIRC72igFVNo'),
(4, 'test12345', '$2y$10$ahzq/is5S970cTGiUegxKOv5g38pZDG4HxYGEcpFioS5VdtaboI/2', 'test12345@hotmail.com', 1, '2026-04-08 16:40:03', 0, 0, 2, 0, '8DXS5XOULLL9wf6c');

-- --------------------------------------------------------

--
-- Structure de la table `users_log`
--

CREATE TABLE `users_log` (
  `id` int(11) NOT NULL,
  `playerid` int(11) NOT NULL,
  `message` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users_log`
--

INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1, 1, '<b>Welcome on <font color=\'#0080FF\'>Andromeda</font></b> (beta)<br/>Your firm gave you 200.000 U.<br/>Have fun !<br/>', '2026-04-04 16:54:06'),
(2, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-05 11:42:14'),
(3, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-05 14:48:06'),
(4, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-05 14:48:10'),
(5, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-05 18:14:57'),
(6, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-05 18:15:06'),
(7, 2, '<b>Welcome on <font color=\'#0080FF\'>Andromeda</font></b> (beta)<br/>Your firm gave you 200.000 U.<br/>Have fun !<br/>', '2026-04-06 08:53:43'),
(8, 3, '<b>Welcome on <font color=\'#0080FF\'>Andromeda</font></b> (beta)<br/>Your firm gave you 200.000 U.<br/>Have fun !<br/>', '2026-04-06 11:28:21'),
(9, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-06 11:29:38'),
(10, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-06 11:29:56'),
(11, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-06 22:49:55'),
(12, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 10:05:46'),
(13, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 10:05:53'),
(14, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 10:07:14'),
(15, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 22:18:02'),
(16, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 22:18:26'),
(17, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-07 22:18:38'),
(18, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 14:52:59'),
(19, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 14:53:19'),
(20, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 14:53:28'),
(21, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 14:53:29'),
(22, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 14:53:41'),
(23, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 16:26:20'),
(24, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 16:34:25'),
(25, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:34:34'),
(26, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:34:35'),
(27, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:34:36'),
(28, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 16:34:38'),
(29, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 16:34:49'),
(30, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 16:35:29'),
(31, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 16:35:55'),
(32, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:35:58'),
(33, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:35:58'),
(34, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 16:36:29'),
(35, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 16:36:36'),
(36, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 16:36:45'),
(37, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 16:37:27'),
(38, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:37:31'),
(39, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:37:37'),
(40, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 16:38:20'),
(41, 4, '<b>Welcome on <font color=\'#0080FF\'>Andromeda</font></b> (beta)<br/>Your firm gave you 200.000 U.<br/>Have fun !<br/>', '2026-04-08 16:40:03'),
(42, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 16:44:16'),
(43, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 17:29:01'),
(44, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 17:29:19'),
(45, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 17:29:21'),
(46, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 17:52:52'),
(47, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 17:55:46'),
(48, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 17:56:37'),
(49, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 18:13:40'),
(50, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 18:41:22'),
(51, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 18:42:18'),
(52, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 18:42:23'),
(53, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 18:42:25'),
(54, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-08 18:42:26'),
(55, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 18:42:33'),
(56, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 18:43:24'),
(57, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 18:43:34'),
(58, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 18:47:58'),
(59, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 18:47:59'),
(60, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 19:09:54'),
(61, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:11:44'),
(62, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:11:45'),
(63, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:12:40'),
(64, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:12:42'),
(65, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 19:13:08'),
(66, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 19:13:29'),
(67, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:13:33'),
(68, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:13:35'),
(69, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:13:46'),
(70, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:13:47'),
(71, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 19:14:01'),
(72, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:14:07'),
(73, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 19:14:24'),
(74, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:14:28'),
(75, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 19:21:37'),
(76, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 19:21:59'),
(77, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:22:03'),
(78, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 19:22:30'),
(79, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 19:22:30'),
(80, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:22:39'),
(81, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:23:20'),
(82, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:23:30'),
(83, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 19:24:04'),
(84, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 19:24:36'),
(85, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 20:19:59'),
(86, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 20:19:59'),
(87, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 20:20:12'),
(88, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 20:20:19'),
(89, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 20:20:27'),
(90, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 20:20:31'),
(91, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 20:20:35'),
(92, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 20:20:38'),
(93, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 20:24:16'),
(94, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 20:24:21'),
(95, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 20:24:27'),
(96, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 20:24:31'),
(97, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 21:30:37'),
(98, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 21:30:45'),
(99, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 21:31:01'),
(100, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:09:36'),
(101, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:09:36'),
(102, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:09:52'),
(103, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:10:10'),
(104, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:10:53'),
(105, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:11:01'),
(106, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:11:05'),
(107, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:11:21'),
(108, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:11:26'),
(109, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:11:29'),
(110, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:11:39'),
(111, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:12:12'),
(112, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:12:15'),
(113, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:12:17'),
(114, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:12:20'),
(115, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:12:21'),
(116, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:12:35'),
(117, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:15:00'),
(118, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:15:08'),
(119, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:15:15'),
(120, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:17:11'),
(121, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:17:18'),
(122, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:17:20'),
(123, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:17:41'),
(124, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:17:43'),
(125, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:17:45'),
(126, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:17:49'),
(127, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:18:03'),
(128, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:18:12'),
(129, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:18:23'),
(130, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 22:18:30'),
(131, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:18:36'),
(132, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:18:42'),
(133, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:18:54'),
(134, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:18:56'),
(135, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:18:57'),
(136, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:19:06'),
(137, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:19:13'),
(138, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:19:17'),
(139, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:19:27'),
(140, 1, 'You have detroyed -=[ Boss Devolarium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 128 npc point(s).<br/>You received 128 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 22:20:09'),
(141, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:10'),
(142, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:20:13'),
(143, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-08 22:20:15'),
(144, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:16'),
(145, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:18'),
(146, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:23'),
(147, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:25'),
(148, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:27'),
(149, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:28'),
(150, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:20:29'),
(151, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:20:51'),
(152, 1, 'You have detroyed -=[ Boss Devolarium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 128 npc point(s).<br/>You received 128 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-08 22:21:54'),
(153, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:21:57'),
(154, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:21:58'),
(155, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:21:59'),
(156, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:21:59'),
(157, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 22:22:08'),
(158, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:22:09'),
(159, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-08 22:22:17'),
(160, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:22:27'),
(161, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-08 22:22:46'),
(162, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-08 22:22:49'),
(163, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-08 22:29:32'),
(164, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 08:13:28'),
(165, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 08:13:30'),
(166, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:13:59'),
(167, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-09 08:14:14'),
(168, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:14:21'),
(169, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:14:28'),
(170, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 08:15:50'),
(171, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:15:57'),
(172, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 08:17:04'),
(173, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 08:17:41'),
(174, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-09 08:17:45'),
(175, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-09 08:17:50'),
(176, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:17:52'),
(177, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:17:54'),
(178, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:17:56'),
(179, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-09 08:17:57'),
(180, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-09 08:18:01'),
(181, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 08:18:54'),
(182, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-09 08:19:24'),
(183, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 08:22:20'),
(184, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 08:22:23'),
(185, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:22:33'),
(186, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:22:42'),
(187, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 08:22:43'),
(188, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:22:51'),
(189, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:23:01'),
(190, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 08:24:42'),
(191, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 08:24:56'),
(192, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 08:24:58'),
(193, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 08:25:02'),
(194, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 09:42:25'),
(195, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:42:31');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(196, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 09:42:32'),
(197, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:42:45'),
(198, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 09:43:16'),
(199, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 09:43:18'),
(200, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 09:43:37'),
(201, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 09:44:01'),
(202, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 09:44:16'),
(203, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:44:19'),
(204, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:44:22'),
(205, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 09:44:23'),
(206, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-09 09:44:33'),
(207, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:44:51'),
(208, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:45:29'),
(209, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:45:48'),
(210, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:45:54'),
(211, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:46:06'),
(212, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 09:46:35'),
(213, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:46:39'),
(214, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-09 09:47:02'),
(215, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-09 09:47:06'),
(216, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-09 09:48:53'),
(217, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:17:37'),
(218, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:17:50'),
(219, 2, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 01:18:03'),
(220, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:18:07'),
(221, 2, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 01:18:11'),
(222, 2, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-10 01:18:29'),
(223, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:18:33'),
(224, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:19:05'),
(225, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:19:18'),
(226, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:19:23'),
(227, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:19:30'),
(228, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:19:42'),
(229, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:19:46'),
(230, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:19:49'),
(231, 2, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 01:20:18'),
(232, 2, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 01:20:20'),
(233, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:20:31'),
(234, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:20:44'),
(235, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:20:52'),
(236, 2, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-10 01:20:58'),
(237, 1, 'You have destroyed lefaucheur1.', '2026-04-10 01:21:34'),
(238, 2, 'You have been destroyed by lefaucheur.', '2026-04-10 01:21:34'),
(239, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 09:35:35'),
(240, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 09:44:41'),
(241, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 09:44:52'),
(242, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-10 09:45:23'),
(243, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-10 09:45:26'),
(244, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 10:01:46'),
(245, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-10 11:08:13'),
(246, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 11:08:16'),
(247, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 11:10:33'),
(248, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 11:10:54'),
(249, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-10 11:11:05'),
(250, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-10 11:39:58'),
(251, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-10 22:09:53'),
(252, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-13 17:43:42'),
(253, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:00'),
(254, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:25'),
(255, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:31'),
(256, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:45'),
(257, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:51'),
(258, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:44:58'),
(259, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-13 17:45:54'),
(260, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:46:01'),
(261, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-13 17:46:03'),
(262, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-13 17:46:04'),
(263, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:46:23'),
(264, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:46:39'),
(265, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-13 17:47:03'),
(266, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:47:16'),
(267, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:47:31'),
(268, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:53:06'),
(269, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-13 17:53:11'),
(270, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 17:54:15'),
(271, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 17:54:26'),
(272, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 17:54:40'),
(273, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 17:55:03'),
(274, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-13 17:55:30'),
(275, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 17:56:15'),
(276, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-13 17:56:40'),
(277, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-13 17:56:57'),
(278, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 18:03:20'),
(279, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:50:21'),
(280, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:51:34'),
(281, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-13 19:52:30'),
(282, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:52:52'),
(283, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:53:04'),
(284, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:53:17'),
(285, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-13 19:53:40'),
(286, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:29:02'),
(287, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:29:10'),
(288, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-14 12:30:07'),
(289, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:30:12'),
(290, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:30:17'),
(291, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 4915200 credits.<br/>You received 1536 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 204800 experience.<br/>You received 1024 honor.', '2026-04-14 12:32:09'),
(292, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:14'),
(293, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:19'),
(294, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:24'),
(295, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:29'),
(296, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:33'),
(297, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:32:35'),
(298, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:33:32'),
(299, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-14 12:34:34'),
(300, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:42:31'),
(301, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 12:42:35'),
(302, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-14 15:59:18'),
(303, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 18:52:11'),
(304, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-14 18:52:25'),
(305, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-14 18:53:00'),
(306, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-15 21:12:33'),
(307, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-15 21:13:11'),
(308, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-15 21:13:23'),
(309, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-15 21:14:14'),
(310, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-15 22:03:43'),
(311, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-16 11:03:29'),
(312, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-16 11:03:33'),
(313, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-16 11:03:54'),
(314, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 11:09:24'),
(315, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 11:09:55'),
(316, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 11:10:28'),
(317, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 11:10:29'),
(318, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 11:10:46'),
(319, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 11:11:43'),
(320, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 11:11:51'),
(321, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-16 11:12:42'),
(322, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 11:12:42'),
(323, 4, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 11:28:51'),
(324, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 13:19:12'),
(325, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 13:19:26'),
(326, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 16:44:23'),
(327, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 17:33:00'),
(328, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-16 17:33:22'),
(329, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:33:26'),
(330, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:33:26'),
(331, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-16 17:33:48'),
(332, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:33:52'),
(333, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:33:56'),
(334, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:34:07'),
(335, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-16 17:34:23'),
(336, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:34:24'),
(337, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 17:34:38'),
(338, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:34:41'),
(339, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 17:34:56'),
(340, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:34:56'),
(341, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:35:02'),
(342, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:35:08'),
(343, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-04-16 17:36:41'),
(344, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:36:42'),
(345, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:36:42'),
(346, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 17:36:43'),
(347, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:36:49'),
(348, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:36:58'),
(349, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:36:59'),
(350, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 17:37:21'),
(351, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 307200 credits.<br/>You received 144 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-16 17:37:40'),
(352, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 17:37:45'),
(353, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:08:14'),
(354, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:08:19'),
(355, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:51:37'),
(356, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:51:40'),
(357, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:51:49'),
(358, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 21:52:22'),
(359, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 21:52:32'),
(360, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 21:52:38'),
(361, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:52:38'),
(362, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 21:52:40'),
(363, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 21:52:43'),
(364, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:52:46'),
(365, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 21:52:49'),
(366, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:52:59'),
(367, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-16 21:53:08'),
(368, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 21:53:15'),
(369, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 22:51:30'),
(370, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 22:52:52'),
(371, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 22:54:10'),
(372, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 22:54:40'),
(373, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-16 22:55:04'),
(374, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 22:55:07'),
(375, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-16 22:55:16'),
(376, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-16 22:55:17'),
(377, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-16 22:55:40'),
(378, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-17 00:05:40'),
(379, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-17 11:45:11'),
(380, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 20:37:17'),
(381, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 20:43:10'),
(382, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-18 20:44:55'),
(383, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 20:45:00'),
(384, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 20:45:05'),
(385, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-18 20:48:54'),
(386, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 22:00:48'),
(387, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 22:01:15'),
(388, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 22:01:15');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(389, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 22:01:20'),
(390, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-18 22:01:22'),
(391, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:03:01'),
(392, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:03:10'),
(393, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-18 22:03:18'),
(394, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:04:07'),
(395, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:04:11'),
(396, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:04:37'),
(397, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:04:39'),
(398, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:04:48'),
(399, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:05:16'),
(400, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:05:28'),
(401, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:05:34'),
(402, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:05:48'),
(403, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:05:49'),
(404, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:05:55'),
(405, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:05:58'),
(406, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:06:06'),
(407, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:06:28'),
(408, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:06:28'),
(409, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:06:57'),
(410, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:06:59'),
(411, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:07:17'),
(412, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:07:18'),
(413, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:07:27'),
(414, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:07:46'),
(415, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:07:47'),
(416, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-18 22:07:54'),
(417, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:08:17'),
(418, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:08:19'),
(419, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:09:03'),
(420, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:09:16'),
(421, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:09:18'),
(422, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:10:19'),
(423, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:10:21'),
(424, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-18 22:10:26'),
(425, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:10:27'),
(426, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:10:31'),
(427, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:11:04'),
(428, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-18 22:11:11'),
(429, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 22:11:19'),
(430, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 23:03:02'),
(431, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-18 23:03:20'),
(432, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 23:03:21'),
(433, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-18 23:03:24'),
(434, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 14:21:01'),
(435, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 14:21:03'),
(436, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-19 14:21:34'),
(437, 3, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 14:25:09'),
(438, 3, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 14:29:01'),
(439, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 14:30:07'),
(440, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:06:55'),
(441, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 16:06:56'),
(442, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:08:41'),
(443, 3, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:15:53'),
(444, 3, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:15:57'),
(445, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 16:16:08'),
(446, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 16:16:17'),
(447, 3, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 16:16:29'),
(448, 3, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:16:37'),
(449, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:18:01'),
(450, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 16:18:02'),
(451, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:18:05'),
(452, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:50:54'),
(453, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 16:50:56'),
(454, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 16:51:00'),
(455, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 16:51:02'),
(456, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 16:51:17'),
(457, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 16:52:21'),
(458, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 18:07:49'),
(459, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 18:08:11'),
(460, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 18:08:14'),
(461, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 18:08:22'),
(462, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 18:09:07'),
(463, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 18:11:44'),
(464, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 20:21:52'),
(465, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 21:45:09'),
(466, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:45:16'),
(467, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 21:45:43'),
(468, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:45:47'),
(469, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 21:45:57'),
(470, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:46:02'),
(471, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:46:04'),
(472, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:46:05'),
(473, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:46:08'),
(474, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 21:46:09'),
(475, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:46:11'),
(476, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 21:46:16'),
(477, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-19 21:52:02'),
(478, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 21:52:06'),
(479, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-19 21:52:08'),
(480, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 23:17:29'),
(481, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-19 23:17:37'),
(482, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 23:17:44'),
(483, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 23:26:00'),
(484, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-19 23:27:32'),
(485, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 08:24:40'),
(486, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 08:24:49'),
(487, 3, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 08:25:39'),
(488, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 08:27:19'),
(489, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:48:13'),
(490, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:50:25'),
(491, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:50:27'),
(492, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:50:34'),
(493, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:50:36'),
(494, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:50:39'),
(495, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:50:41'),
(496, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:50:47'),
(497, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:50:50'),
(498, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:50:53'),
(499, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:50:54'),
(500, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:50:57'),
(501, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:51:01'),
(502, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:51:02'),
(503, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:51:09'),
(504, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:51:15'),
(505, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:51:16'),
(506, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:51:20'),
(507, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:51:26'),
(508, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:51:44'),
(509, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:51:47'),
(510, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:51:50'),
(511, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:51:54'),
(512, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:52:00'),
(513, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:52:02'),
(514, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:52:11'),
(515, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:52:19'),
(516, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:52:23'),
(517, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:52:29'),
(518, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:52:36'),
(519, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:52:38'),
(520, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:52:44'),
(521, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:52:50'),
(522, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:52:53'),
(523, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:52:55'),
(524, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:52:57'),
(525, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:00'),
(526, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:04'),
(527, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:53:07'),
(528, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:08'),
(529, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:09'),
(530, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:17'),
(531, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:53:18'),
(532, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:20'),
(533, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:22'),
(534, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:29'),
(535, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:30'),
(536, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:37'),
(537, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:40'),
(538, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:42'),
(539, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:46'),
(540, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:49'),
(541, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:53:54'),
(542, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:53:59'),
(543, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:54:05'),
(544, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:54:06'),
(545, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:54:10'),
(546, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:54:14'),
(547, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:54:15'),
(548, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:54:16'),
(549, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-20 09:54:18'),
(550, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:54:20'),
(551, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:54:21'),
(552, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:54:25'),
(553, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 09:54:25'),
(554, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 09:54:40'),
(555, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 09:55:21'),
(556, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 11:28:13'),
(557, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 11:28:18'),
(558, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-20 11:29:32'),
(559, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 11:29:33'),
(560, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-20 11:29:35'),
(561, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 19200 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 11:29:36'),
(562, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 11:29:37'),
(563, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 11:29:39'),
(564, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-20 11:29:41'),
(565, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 11:32:59'),
(566, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-20 13:21:43'),
(567, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 14:22:03'),
(568, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-20 15:38:07'),
(569, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 15:38:12'),
(570, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 15:38:18'),
(571, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 15:38:22'),
(572, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-20 15:38:37'),
(573, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 4915200 credits.<br/>You received 1536 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 204800 experience.<br/>You received 1024 honor.', '2026-04-20 15:40:09'),
(574, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 15:40:13'),
(575, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 15:40:19'),
(576, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 153600 credits.<br/>You received 192 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-04-20 17:22:42'),
(577, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 17:22:45'),
(578, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-20 17:25:17'),
(579, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-21 16:17:49'),
(580, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 16:19:11'),
(581, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 16:19:41');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(582, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 16:20:17'),
(583, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 16:20:41'),
(584, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 16:21:12'),
(585, 3, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-21 17:48:06'),
(586, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-21 22:15:06'),
(587, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-22 00:53:32'),
(588, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-22 00:53:40'),
(589, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-22 00:56:24'),
(590, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-22 15:01:17'),
(591, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-22 15:01:58'),
(592, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-04-22 15:03:58'),
(593, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:25'),
(594, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:26'),
(595, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:28'),
(596, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:29'),
(597, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:30'),
(598, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:30'),
(599, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:31'),
(600, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:32'),
(601, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:33'),
(602, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:34'),
(603, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:35'),
(604, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:36'),
(605, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:37'),
(606, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:37'),
(607, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:38'),
(608, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:39'),
(609, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:40'),
(610, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:41'),
(611, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:41'),
(612, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:42'),
(613, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:43'),
(614, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:44'),
(615, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:45'),
(616, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:46'),
(617, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:46'),
(618, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:47'),
(619, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:48'),
(620, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:49'),
(621, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:50'),
(622, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:50'),
(623, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:51'),
(624, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:52'),
(625, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:53'),
(626, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:54'),
(627, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:54'),
(628, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:56'),
(629, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:56'),
(630, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:57'),
(631, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:57'),
(632, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 18:22:58'),
(633, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:21'),
(634, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:21'),
(635, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:22'),
(636, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:23'),
(637, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:24'),
(638, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:24'),
(639, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:26'),
(640, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:26'),
(641, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:27'),
(642, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:28'),
(643, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:29'),
(644, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:30'),
(645, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:31'),
(646, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:32'),
(647, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:32'),
(648, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:33'),
(649, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:34'),
(650, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:35'),
(651, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:36'),
(652, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:36'),
(653, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:37'),
(654, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:38'),
(655, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:39'),
(656, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:40'),
(657, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:41'),
(658, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:42'),
(659, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:43'),
(660, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:43'),
(661, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:45'),
(662, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:46'),
(663, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:47'),
(664, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:48'),
(665, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:48'),
(666, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:49'),
(667, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:50'),
(668, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:50'),
(669, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:51'),
(670, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:52'),
(671, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:53'),
(672, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 18:23:53'),
(673, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:49:54'),
(674, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:49:58'),
(675, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:00'),
(676, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:01'),
(677, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:03'),
(678, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:05'),
(679, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:06'),
(680, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:08'),
(681, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:09'),
(682, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:11'),
(683, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:13'),
(684, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:14'),
(685, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:17'),
(686, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:18'),
(687, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:20'),
(688, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:21'),
(689, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:23'),
(690, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:25'),
(691, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:26'),
(692, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:28'),
(693, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:30'),
(694, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:31'),
(695, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:33'),
(696, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:34'),
(697, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:36'),
(698, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:38'),
(699, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:39'),
(700, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:41'),
(701, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:43'),
(702, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:44'),
(703, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:46'),
(704, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:48'),
(705, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:49'),
(706, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:51'),
(707, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:53'),
(708, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:54'),
(709, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:56'),
(710, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:57'),
(711, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:50:59'),
(712, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:51:01'),
(713, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 21:51:26'),
(714, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-22 21:53:37'),
(715, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 153600 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-04-22 21:54:21'),
(716, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 21:54:22'),
(717, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:54:27'),
(718, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:54:38'),
(719, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-22 21:54:43'),
(720, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-22 21:54:48'),
(721, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-22 21:54:50'),
(722, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 21:56:12'),
(723, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-22 21:56:14'),
(724, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-23 17:25:26'),
(725, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-23 17:27:33'),
(726, 3, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-23 17:30:29'),
(727, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-04-23 21:23:36'),
(728, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-24 12:26:13'),
(729, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-24 12:26:18'),
(730, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-24 12:26:20'),
(731, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-24 14:11:13'),
(732, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-24 14:11:34'),
(733, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-04-24 14:11:40'),
(734, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-24 14:11:44'),
(735, 1, 'You have destroyed R?CIN?NT?.', '2026-04-26 08:55:33'),
(736, 3, 'You have been destroyed by lefaucheur.', '2026-04-26 08:55:33'),
(737, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:02:49'),
(738, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:03:16'),
(739, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:03:43'),
(740, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:03:49'),
(741, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:03:54'),
(742, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:04:10'),
(743, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:04:27'),
(744, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:04:52'),
(745, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:05:09'),
(746, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:05:28'),
(747, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:13:18'),
(748, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:14:34'),
(749, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:14:49'),
(750, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:14:53'),
(751, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:15:01'),
(752, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:15:07'),
(753, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:15:12'),
(754, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:15:20'),
(755, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:15:56'),
(756, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:16:11'),
(757, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:16:26'),
(758, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:16:54'),
(759, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 12:16:57'),
(760, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:39:28'),
(761, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:39:37'),
(762, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:39:50'),
(763, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:39:53'),
(764, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:39:57'),
(765, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:40:07'),
(766, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:42:21'),
(767, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:42:33'),
(768, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:42:38'),
(769, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:42:47'),
(770, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:42:51'),
(771, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-26 23:42:54'),
(772, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:43:06'),
(773, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:43:42'),
(774, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-26 23:43:51'),
(775, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-26 23:43:57'),
(776, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-26 23:43:59'),
(777, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-26 23:49:37'),
(778, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 18:42:37');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(779, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 18:42:49'),
(780, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 18:43:07'),
(781, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 18:43:12'),
(782, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 18:43:46'),
(783, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:22'),
(784, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:33'),
(785, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:35'),
(786, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:39'),
(787, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:44'),
(788, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:45'),
(789, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:54'),
(790, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:31:55'),
(791, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:05'),
(792, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:07'),
(793, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:09'),
(794, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:19'),
(795, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:29'),
(796, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:45'),
(797, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:54'),
(798, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:32:57'),
(799, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:00'),
(800, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:08'),
(801, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:14'),
(802, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:24'),
(803, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:27'),
(804, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:40'),
(805, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:33:41'),
(806, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:23'),
(807, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:30'),
(808, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:31'),
(809, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:32'),
(810, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:33'),
(811, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:34'),
(812, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:45'),
(813, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:50'),
(814, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:34:54'),
(815, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:01'),
(816, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:12'),
(817, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:17'),
(818, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:18'),
(819, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:35'),
(820, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:36'),
(821, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:41'),
(822, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:45'),
(823, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:48'),
(824, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:50'),
(825, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:52'),
(826, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:35:58'),
(827, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-27 23:36:01'),
(828, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:05'),
(829, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:19'),
(830, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:24'),
(831, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:36'),
(832, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:41'),
(833, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:44'),
(834, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-28 10:23:49'),
(835, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:23:54'),
(836, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 10:24:04'),
(837, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-28 10:24:41'),
(838, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-28 10:24:46'),
(839, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 13:27:49'),
(840, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-04-28 13:28:00'),
(841, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 13:28:10'),
(842, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 13:28:14'),
(843, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-28 13:28:19'),
(844, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-04-28 13:28:20'),
(845, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-04-28 13:28:27'),
(846, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-02 23:27:43'),
(847, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-02 23:31:22'),
(848, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-02 23:31:26'),
(849, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-02 23:31:48'),
(850, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:44'),
(851, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:45'),
(852, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:46'),
(853, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:49'),
(854, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:49'),
(855, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:51'),
(856, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:52'),
(857, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:52'),
(858, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:53'),
(859, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:54'),
(860, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:54'),
(861, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:55'),
(862, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:56'),
(863, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:57'),
(864, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:58'),
(865, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:33:59'),
(866, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:00'),
(867, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:01'),
(868, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:02'),
(869, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:03'),
(870, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:03'),
(871, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:04'),
(872, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:05'),
(873, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:06'),
(874, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:07'),
(875, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:08'),
(876, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:09'),
(877, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:09'),
(878, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:10'),
(879, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:11'),
(880, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:12'),
(881, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:13'),
(882, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:14'),
(883, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:14'),
(884, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:15'),
(885, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:16'),
(886, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:16'),
(887, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:17'),
(888, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:17'),
(889, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-02 23:34:18'),
(890, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:40'),
(891, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:41'),
(892, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:44'),
(893, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:46'),
(894, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:47'),
(895, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:48'),
(896, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:49'),
(897, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:50'),
(898, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:51'),
(899, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:53'),
(900, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:53'),
(901, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:55'),
(902, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:56'),
(903, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:57'),
(904, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:58'),
(905, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:34:58'),
(906, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:00'),
(907, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:01'),
(908, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:02'),
(909, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:03'),
(910, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:04'),
(911, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:04'),
(912, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:05'),
(913, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:06'),
(914, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:07'),
(915, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:08'),
(916, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:09'),
(917, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:10'),
(918, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:11'),
(919, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:12'),
(920, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:13'),
(921, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:14'),
(922, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:15'),
(923, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:15'),
(924, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:17'),
(925, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:17'),
(926, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:19'),
(927, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:19'),
(928, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:20'),
(929, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-05-02 23:35:24'),
(930, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:37'),
(931, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:38'),
(932, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:39'),
(933, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:40'),
(934, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:41'),
(935, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:42'),
(936, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:42'),
(937, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:43'),
(938, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:45'),
(939, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:46'),
(940, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:47'),
(941, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:48'),
(942, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:48'),
(943, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:49'),
(944, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:50'),
(945, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:52'),
(946, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:53'),
(947, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:54'),
(948, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:55'),
(949, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:56'),
(950, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:58'),
(951, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:35:59'),
(952, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:00'),
(953, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:00'),
(954, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:01'),
(955, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:04'),
(956, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:07'),
(957, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:07'),
(958, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:08'),
(959, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:09'),
(960, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:10'),
(961, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:11'),
(962, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:13'),
(963, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:15'),
(964, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:16'),
(965, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:17'),
(966, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:19'),
(967, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:20'),
(968, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:20'),
(969, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:36:22'),
(970, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:33'),
(971, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:34'),
(972, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:35'),
(973, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:36');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(974, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:36'),
(975, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:38'),
(976, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:41'),
(977, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:42'),
(978, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:43'),
(979, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:44'),
(980, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:45'),
(981, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:45'),
(982, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:46'),
(983, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:47'),
(984, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:48'),
(985, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:49'),
(986, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:50'),
(987, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:50'),
(988, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:52'),
(989, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:53'),
(990, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:54'),
(991, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:55'),
(992, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:57'),
(993, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:36:59'),
(994, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:00'),
(995, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:01'),
(996, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:02'),
(997, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:03'),
(998, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:04'),
(999, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:04'),
(1000, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:05'),
(1001, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:06'),
(1002, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:07'),
(1003, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:08'),
(1004, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:09'),
(1005, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:10'),
(1006, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:37:11'),
(1007, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:10'),
(1008, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:11'),
(1009, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:12'),
(1010, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:13'),
(1011, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:14'),
(1012, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:15'),
(1013, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:16'),
(1014, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:17'),
(1015, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:18'),
(1016, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:19'),
(1017, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:19'),
(1018, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:20'),
(1019, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:21'),
(1020, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:22'),
(1021, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:23'),
(1022, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:24'),
(1023, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:24'),
(1024, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:25'),
(1025, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:26'),
(1026, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:27'),
(1027, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:28'),
(1028, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:29'),
(1029, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:29'),
(1030, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:30'),
(1031, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:31'),
(1032, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:32'),
(1033, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:33'),
(1034, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:34'),
(1035, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:35'),
(1036, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:36'),
(1037, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:36'),
(1038, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:37'),
(1039, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:38'),
(1040, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:39'),
(1041, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:40'),
(1042, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:40'),
(1043, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:41'),
(1044, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:42'),
(1045, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:43'),
(1046, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:44'),
(1047, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:45'),
(1048, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:46'),
(1049, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:47'),
(1050, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:48'),
(1051, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:49'),
(1052, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:50'),
(1053, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:50'),
(1054, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:51'),
(1055, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:52'),
(1056, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:53'),
(1057, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:54'),
(1058, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:55'),
(1059, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:55'),
(1060, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:56'),
(1061, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:57'),
(1062, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:58'),
(1063, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:38:59'),
(1064, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:00'),
(1065, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:01'),
(1066, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:02'),
(1067, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:03'),
(1068, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:03'),
(1069, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:04'),
(1070, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:05'),
(1071, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:07'),
(1072, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:09'),
(1073, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:10'),
(1074, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:11'),
(1075, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:12'),
(1076, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:13'),
(1077, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:14'),
(1078, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:15'),
(1079, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:16'),
(1080, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:17'),
(1081, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:18'),
(1082, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:19'),
(1083, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:20'),
(1084, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:21'),
(1085, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:22'),
(1086, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-02 23:39:24'),
(1087, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:41'),
(1088, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:44'),
(1089, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:46'),
(1090, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:49'),
(1091, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:50'),
(1092, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:51'),
(1093, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:52'),
(1094, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:53'),
(1095, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:55'),
(1096, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:55'),
(1097, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:58'),
(1098, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:39:59'),
(1099, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:00'),
(1100, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:01'),
(1101, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:02'),
(1102, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:03'),
(1103, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:04'),
(1104, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:06'),
(1105, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:06'),
(1106, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:07'),
(1107, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:20'),
(1108, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:21'),
(1109, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:22'),
(1110, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:23'),
(1111, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:23'),
(1112, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:25'),
(1113, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:25'),
(1114, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:26'),
(1115, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:27'),
(1116, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:28'),
(1117, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:29'),
(1118, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:30'),
(1119, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:31'),
(1120, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:32'),
(1121, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:33'),
(1122, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:34'),
(1123, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:35'),
(1124, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:36'),
(1125, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:36'),
(1126, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:37'),
(1127, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:38'),
(1128, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:39'),
(1129, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:40'),
(1130, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:40'),
(1131, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:41'),
(1132, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:42'),
(1133, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:43'),
(1134, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:44'),
(1135, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:45'),
(1136, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:45'),
(1137, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:46'),
(1138, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:47'),
(1139, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:48'),
(1140, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:49'),
(1141, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:49'),
(1142, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:50'),
(1143, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:51'),
(1144, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:52'),
(1145, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:53'),
(1146, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:53'),
(1147, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:54'),
(1148, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:55'),
(1149, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:56'),
(1150, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:57'),
(1151, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:58'),
(1152, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:58'),
(1153, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:40:59'),
(1154, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:01'),
(1155, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:01'),
(1156, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:02'),
(1157, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:03'),
(1158, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:04'),
(1159, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:05'),
(1160, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:06'),
(1161, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:07'),
(1162, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:08'),
(1163, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:11'),
(1164, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:11'),
(1165, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:12');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1166, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:13'),
(1167, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:14'),
(1168, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:15'),
(1169, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:16'),
(1170, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:17'),
(1171, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:18'),
(1172, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:20'),
(1173, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:21'),
(1174, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:22'),
(1175, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:23'),
(1176, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:24'),
(1177, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:25'),
(1178, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:26'),
(1179, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:27'),
(1180, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:28'),
(1181, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:29'),
(1182, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:30'),
(1183, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:31'),
(1184, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:32'),
(1185, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:32'),
(1186, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:41:33'),
(1187, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:41:46'),
(1188, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:41:48'),
(1189, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:41:53'),
(1190, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:41:56'),
(1191, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:01'),
(1192, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:02'),
(1193, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:08'),
(1194, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:09'),
(1195, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:12'),
(1196, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:13'),
(1197, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:16'),
(1198, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:17'),
(1199, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:19'),
(1200, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:20'),
(1201, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:23'),
(1202, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-05-02 23:42:24'),
(1203, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:37'),
(1204, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:37'),
(1205, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:38'),
(1206, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:39'),
(1207, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:41'),
(1208, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:42'),
(1209, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:43'),
(1210, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:45'),
(1211, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:45'),
(1212, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:46'),
(1213, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:49'),
(1214, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:50'),
(1215, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:51'),
(1216, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:51'),
(1217, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:52'),
(1218, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:53'),
(1219, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:54'),
(1220, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:55'),
(1221, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:56'),
(1222, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:42:59'),
(1223, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:00'),
(1224, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:00'),
(1225, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:03'),
(1226, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:03'),
(1227, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:04'),
(1228, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:06'),
(1229, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:07'),
(1230, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:08'),
(1231, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:09'),
(1232, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:10'),
(1233, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:11'),
(1234, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:12'),
(1235, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:13'),
(1236, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:15'),
(1237, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:16'),
(1238, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:17'),
(1239, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:18'),
(1240, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:20'),
(1241, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:21'),
(1242, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:21'),
(1243, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:23'),
(1244, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:23'),
(1245, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:24'),
(1246, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:25'),
(1247, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:26'),
(1248, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:27'),
(1249, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:28'),
(1250, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:29'),
(1251, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:30'),
(1252, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:31'),
(1253, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:32'),
(1254, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:32'),
(1255, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:33'),
(1256, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:34'),
(1257, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:40'),
(1258, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:40'),
(1259, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:42'),
(1260, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:45'),
(1261, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:46'),
(1262, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:47'),
(1263, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:49'),
(1264, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:50'),
(1265, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:51'),
(1266, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:52'),
(1267, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:54'),
(1268, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:56'),
(1269, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:57'),
(1270, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:58'),
(1271, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:59'),
(1272, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:43:59'),
(1273, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:00'),
(1274, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:02'),
(1275, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:03'),
(1276, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:04'),
(1277, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:05'),
(1278, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:06'),
(1279, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:07'),
(1280, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:08'),
(1281, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:08'),
(1282, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-02 23:44:09'),
(1283, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:29'),
(1284, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:31'),
(1285, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:34'),
(1286, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:40'),
(1287, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:43'),
(1288, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:50'),
(1289, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:53'),
(1290, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:54'),
(1291, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:44:59'),
(1292, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:01'),
(1293, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:04'),
(1294, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:07'),
(1295, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:08'),
(1296, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:12'),
(1297, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:15'),
(1298, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-05-02 23:45:19'),
(1299, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:31'),
(1300, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:32'),
(1301, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:33'),
(1302, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:36'),
(1303, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:37'),
(1304, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:37'),
(1305, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:38'),
(1306, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:41'),
(1307, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:41'),
(1308, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:43'),
(1309, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:44'),
(1310, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:45'),
(1311, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:46'),
(1312, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:47'),
(1313, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:48'),
(1314, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:49'),
(1315, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:51'),
(1316, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:52'),
(1317, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:52'),
(1318, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:53'),
(1319, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:54'),
(1320, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:55'),
(1321, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:56'),
(1322, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:56'),
(1323, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:58'),
(1324, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:45:59'),
(1325, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:46:00'),
(1326, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:46:01'),
(1327, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:46:02'),
(1328, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-02 23:46:03'),
(1329, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-03 00:28:46'),
(1330, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-03 02:28:18'),
(1331, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-03 02:28:32'),
(1332, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-04 01:17:51'),
(1333, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-05 01:27:28'),
(1334, 1, 'You have destroyed R?CIN?NT?.', '2026-05-05 01:31:41'),
(1335, 3, 'You have been destroyed by lefaucheur.', '2026-05-05 01:31:41'),
(1336, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-05 15:48:39'),
(1337, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-05 15:49:00'),
(1338, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-05 15:49:04'),
(1339, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-06 18:02:41'),
(1340, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 18:02:48'),
(1341, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 18:02:54'),
(1342, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 18:04:26'),
(1343, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 18:04:36'),
(1344, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-06 18:05:03'),
(1345, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 18:05:05'),
(1346, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 20:46:25'),
(1347, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-06 20:46:46'),
(1348, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-06 20:47:32'),
(1349, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-06 20:47:41'),
(1350, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 20:47:43'),
(1351, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-06 20:50:34'),
(1352, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-06 20:50:51'),
(1353, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 20:50:54'),
(1354, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-06 20:50:58'),
(1355, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:07:17');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1356, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:07:28'),
(1357, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:07:31'),
(1358, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-07 15:07:40'),
(1359, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-07 15:08:41'),
(1360, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:09:52'),
(1361, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:10:10'),
(1362, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:10:14'),
(1363, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:10:20'),
(1364, 1, 'You have detroyed -=[ Protegit ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 15 npc point(s).<br/>You received 15 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-07 15:10:27'),
(1365, 1, 'You have detroyed -=[ Cubikon ]=-.<br/>You received 4915200 credits.<br/>You received 3072 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 512000 experience.<br/>You received 4096 honor.', '2026-05-08 00:25:59'),
(1366, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 00:26:12'),
(1367, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 00:26:16'),
(1368, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 00:26:19'),
(1369, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 00:26:26'),
(1370, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 00:26:46'),
(1371, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-08 00:26:59'),
(1372, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 00:27:14'),
(1373, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 00:27:54'),
(1374, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 00:27:56'),
(1375, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 00:28:01'),
(1376, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 00:28:10'),
(1377, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:14:18'),
(1378, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:14:45'),
(1379, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:14:55'),
(1380, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:15:16'),
(1381, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:15:31'),
(1382, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:15:33'),
(1383, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-08 02:15:41'),
(1384, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:15:45'),
(1385, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:15:47'),
(1386, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 02:16:15'),
(1387, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:16:18'),
(1388, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:16:21'),
(1389, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 02:16:54'),
(1390, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:16:57'),
(1391, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:17:10'),
(1392, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-08 02:17:14'),
(1393, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:17:30'),
(1394, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:17:34'),
(1395, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:17:36'),
(1396, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-08 02:17:40'),
(1397, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 02:18:07'),
(1398, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-08 02:18:08'),
(1399, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:18:26'),
(1400, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-08 02:18:40'),
(1401, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-08 02:19:02'),
(1402, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:02:59'),
(1403, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:02:59'),
(1404, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:03:04'),
(1405, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:03:04'),
(1406, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:03:09'),
(1407, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 600 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 200 experience.<br/>You received 1 honor.', '2026-05-09 02:03:09'),
(1408, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-09 02:03:15'),
(1409, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-09 02:04:27'),
(1410, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-09 02:04:29'),
(1411, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:52'),
(1412, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:52'),
(1413, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:54'),
(1414, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:54'),
(1415, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:56'),
(1416, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:56'),
(1417, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:57'),
(1418, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:58'),
(1419, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:32:59'),
(1420, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:00'),
(1421, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:01'),
(1422, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:02'),
(1423, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:03'),
(1424, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:04'),
(1425, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:05'),
(1426, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:06'),
(1427, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:07'),
(1428, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:08'),
(1429, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:09'),
(1430, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:09'),
(1431, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:10'),
(1432, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:11'),
(1433, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:12'),
(1434, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:13'),
(1435, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:14'),
(1436, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:15'),
(1437, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:16'),
(1438, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:17'),
(1439, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:18'),
(1440, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:18'),
(1441, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:19'),
(1442, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:20'),
(1443, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:21'),
(1444, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:22'),
(1445, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:23'),
(1446, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:24'),
(1447, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:25'),
(1448, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:25'),
(1449, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:26'),
(1450, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 20:33:29'),
(1451, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-11 21:59:50'),
(1452, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-11 21:59:53'),
(1453, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:00:55'),
(1454, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-11 22:00:56'),
(1455, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:01:34'),
(1456, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-11 22:01:37'),
(1457, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-11 22:01:54'),
(1458, 1, 'You have detroyed -=[ Boss Sibelon ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 38 npc point(s).<br/>You received 38 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-11 22:02:15'),
(1459, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:02:17'),
(1460, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:02:18'),
(1461, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:02:19'),
(1462, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:02:20'),
(1463, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:02:21'),
(1464, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:02:22'),
(1465, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:03:10'),
(1466, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:04:55'),
(1467, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:04:55'),
(1468, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:04:57'),
(1469, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:04:58'),
(1470, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:15'),
(1471, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:05:19'),
(1472, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:19'),
(1473, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:20'),
(1474, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:21'),
(1475, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:24'),
(1476, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:25'),
(1477, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:05:26'),
(1478, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:27'),
(1479, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:05:28'),
(1480, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:05:29'),
(1481, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:30'),
(1482, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:30'),
(1483, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:31'),
(1484, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:32'),
(1485, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-11 22:05:33'),
(1486, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:34'),
(1487, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:35'),
(1488, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:36'),
(1489, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:37'),
(1490, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-11 22:05:38'),
(1491, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:39'),
(1492, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:40'),
(1493, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:41'),
(1494, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:41'),
(1495, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 22:05:42'),
(1496, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:42:59'),
(1497, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-11 23:47:09'),
(1498, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-11 23:47:42'),
(1499, 3, 'You have destroyed lefaucheur.', '2026-05-11 23:49:28'),
(1500, 1, 'You have been destroyed by R?CIN?NT?.', '2026-05-11 23:49:28'),
(1501, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:49:56'),
(1502, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:49:57'),
(1503, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:49:58'),
(1504, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:49:59'),
(1505, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:02'),
(1506, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:03'),
(1507, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:04'),
(1508, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:04'),
(1509, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:05'),
(1510, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:06'),
(1511, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:07'),
(1512, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:08'),
(1513, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:09'),
(1514, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:09'),
(1515, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:10'),
(1516, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:11'),
(1517, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:12'),
(1518, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:13'),
(1519, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:15'),
(1520, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:16'),
(1521, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:17'),
(1522, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:17'),
(1523, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:18'),
(1524, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:19'),
(1525, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:20'),
(1526, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:21'),
(1527, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:22'),
(1528, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:23'),
(1529, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:23'),
(1530, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:25'),
(1531, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:25'),
(1532, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:26'),
(1533, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:27'),
(1534, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:28'),
(1535, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:29'),
(1536, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:30'),
(1537, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:31'),
(1538, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:32'),
(1539, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:33'),
(1540, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-11 23:50:34'),
(1541, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:01'),
(1542, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:02'),
(1543, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:02'),
(1544, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:04'),
(1545, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:05'),
(1546, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:06'),
(1547, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:07'),
(1548, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:08'),
(1549, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:09');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1550, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:09'),
(1551, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:11'),
(1552, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:13'),
(1553, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:14'),
(1554, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:17'),
(1555, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:34'),
(1556, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:34'),
(1557, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:36'),
(1558, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:36'),
(1559, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:37'),
(1560, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:38'),
(1561, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:39'),
(1562, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:40'),
(1563, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:41'),
(1564, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:41'),
(1565, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:42'),
(1566, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:43'),
(1567, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:44'),
(1568, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:45'),
(1569, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:46'),
(1570, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:47'),
(1571, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:48'),
(1572, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:49'),
(1573, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:49'),
(1574, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:50'),
(1575, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:51'),
(1576, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:53'),
(1577, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:54'),
(1578, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:55'),
(1579, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:56'),
(1580, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-11 23:51:57'),
(1581, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-12 09:11:53'),
(1582, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 09:11:59'),
(1583, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 09:12:03'),
(1584, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 09:12:25'),
(1585, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 09:15:50'),
(1586, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:06'),
(1587, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:11'),
(1588, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:14'),
(1589, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:15'),
(1590, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:16'),
(1591, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:19'),
(1592, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:20'),
(1593, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:21'),
(1594, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:22'),
(1595, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 10:50:23'),
(1596, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:24'),
(1597, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-12 10:50:27'),
(1598, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:14'),
(1599, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:15'),
(1600, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:16'),
(1601, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:18'),
(1602, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 10:53:19'),
(1603, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:20'),
(1604, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:21'),
(1605, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:22'),
(1606, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:23'),
(1607, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:24'),
(1608, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 10:53:25'),
(1609, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:26'),
(1610, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:27'),
(1611, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:28'),
(1612, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:28'),
(1613, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:29'),
(1614, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:30'),
(1615, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:31'),
(1616, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:32'),
(1617, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 10:53:32'),
(1618, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:34'),
(1619, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:35'),
(1620, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:37'),
(1621, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:39'),
(1622, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:40'),
(1623, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:41'),
(1624, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 10:53:41'),
(1625, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 10:53:42'),
(1626, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 10:53:43'),
(1627, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 10:53:46'),
(1628, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:42'),
(1629, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:44'),
(1630, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:47'),
(1631, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:51'),
(1632, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:52'),
(1633, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:55'),
(1634, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:56'),
(1635, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:58'),
(1636, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:55:59'),
(1637, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:56:02'),
(1638, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:56:04'),
(1639, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-12 11:56:05'),
(1640, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-12 11:56:17'),
(1641, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:32'),
(1642, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:34'),
(1643, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:37'),
(1644, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:38'),
(1645, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:40'),
(1646, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:56:42'),
(1647, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:56:44'),
(1648, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:56:46'),
(1649, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:56:48'),
(1650, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:56:50'),
(1651, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:51'),
(1652, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:51'),
(1653, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:52'),
(1654, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:53'),
(1655, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:56'),
(1656, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:56'),
(1657, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:57'),
(1658, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:56:58'),
(1659, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-12 11:56:59'),
(1660, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:57:01'),
(1661, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-12 11:57:01'),
(1662, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:57:02'),
(1663, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:57:04'),
(1664, 1, 'You have detroyed -=[ Boss Mordon ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-12 11:57:11'),
(1665, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-13 09:07:44'),
(1666, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-13 09:07:47'),
(1667, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-13 09:08:06'),
(1668, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-13 09:08:12'),
(1669, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-13 09:09:36'),
(1670, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-13 09:09:55'),
(1671, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-13 09:09:56'),
(1672, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-13 09:09:57'),
(1673, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-13 09:09:58'),
(1674, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-13 09:09:59'),
(1675, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-13 18:14:23'),
(1676, 1, 'You have destroyed R?CIN?NT?.', '2026-05-13 19:31:11'),
(1677, 3, 'You have been destroyed by lefaucheur.', '2026-05-13 19:31:11'),
(1678, 1, 'You have destroyed R?CIN?NT?.', '2026-05-13 22:36:34'),
(1679, 3, 'You have been destroyed by lefaucheur.', '2026-05-13 22:36:34'),
(1680, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 16:13:01'),
(1681, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-20 17:05:03'),
(1682, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-20 17:05:20'),
(1683, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-20 17:05:21'),
(1684, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 17:05:23'),
(1685, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-20 17:05:28'),
(1686, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 17:05:35'),
(1687, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 17:19:06'),
(1688, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-20 17:19:12'),
(1689, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 21:00:01'),
(1690, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 21:00:59'),
(1691, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-20 21:01:55'),
(1692, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-20 21:01:58'),
(1693, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-20 21:02:00'),
(1694, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-20 21:03:54'),
(1695, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-20 21:03:56'),
(1696, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-20 21:03:59'),
(1697, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-20 21:04:01'),
(1698, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-20 21:04:05'),
(1699, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-20 21:04:08'),
(1700, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-20 21:04:12'),
(1701, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-20 21:48:00'),
(1702, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-20 23:31:08'),
(1703, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-20 23:31:17'),
(1704, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-20 23:31:21'),
(1705, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-20 23:31:35'),
(1706, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-20 23:31:40'),
(1707, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-20 23:31:42'),
(1708, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-20 23:31:44'),
(1709, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 11:36:01'),
(1710, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 11:36:02'),
(1711, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 12:38:46'),
(1712, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-21 12:39:04'),
(1713, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-21 12:40:39'),
(1714, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-21 12:40:52'),
(1715, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 12:40:58'),
(1716, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-21 12:41:34'),
(1717, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 12:41:37'),
(1718, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-21 12:41:43'),
(1719, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 12:57:09'),
(1720, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-21 13:43:45'),
(1721, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-21 15:50:38'),
(1722, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-21 15:50:52'),
(1723, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-21 15:51:11'),
(1724, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-21 15:51:13'),
(1725, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-21 15:51:23'),
(1726, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-21 17:17:43'),
(1727, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:50:59'),
(1728, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:51:29'),
(1729, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-21 20:51:30'),
(1730, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:51:35'),
(1731, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:51:42'),
(1732, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-21 20:52:04'),
(1733, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:52:12'),
(1734, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-21 20:52:14'),
(1735, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:52:16'),
(1736, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 20:52:32'),
(1737, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 22:20:22'),
(1738, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-21 22:20:23'),
(1739, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:31:28'),
(1740, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:31:31'),
(1741, 1, 'You have detroyed -=[ Boss StreuneR ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-22 19:31:35'),
(1742, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:31:39'),
(1743, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:32:04'),
(1744, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:32:11');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1745, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:32:13'),
(1746, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:32:16'),
(1747, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:32:59'),
(1748, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:33:37'),
(1749, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-22 19:33:56'),
(1750, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-23 12:54:08'),
(1751, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-23 12:54:13'),
(1752, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-23 12:54:14'),
(1753, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:19:30'),
(1754, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:19:39'),
(1755, 1, 'You have detroyed -=[ StreuneR ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:19:48'),
(1756, 1, 'You have detroyed -=[ Boss Kristallin ]=-.<br/>You received 76800 credits.<br/>You received 96 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-25 17:21:49'),
(1757, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-25 17:21:59'),
(1758, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-25 17:22:06'),
(1759, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-05-25 17:23:20'),
(1760, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-25 17:23:22'),
(1761, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-25 17:24:16'),
(1762, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:24:26'),
(1763, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:24:30'),
(1764, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:24:48'),
(1765, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:25:06'),
(1766, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:25:17'),
(1767, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-25 17:25:43'),
(1768, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-25 17:26:10'),
(1769, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-25 17:26:11'),
(1770, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:14'),
(1771, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:21'),
(1772, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:29'),
(1773, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:37'),
(1774, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-25 17:26:38'),
(1775, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:42'),
(1776, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:45'),
(1777, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:48'),
(1778, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:26:50'),
(1779, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:04'),
(1780, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:08'),
(1781, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:24'),
(1782, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:29'),
(1783, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-25 17:27:32'),
(1784, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:37'),
(1785, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:27:39'),
(1786, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-25 17:27:54'),
(1787, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:02'),
(1788, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:04'),
(1789, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-25 17:28:37'),
(1790, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:40'),
(1791, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:42'),
(1792, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:46'),
(1793, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 17:28:48'),
(1794, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-25 17:29:19'),
(1795, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 19:43:34'),
(1796, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-25 19:44:07'),
(1797, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 20:47:06'),
(1798, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 20:47:14'),
(1799, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 20:47:22'),
(1800, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-25 21:06:17'),
(1801, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-25 21:06:20'),
(1802, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-25 21:06:23'),
(1803, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-25 22:31:19'),
(1804, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-25 22:31:48'),
(1805, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-25 22:32:24'),
(1806, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-25 22:32:56'),
(1807, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 14:48:33'),
(1808, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 14:48:37'),
(1809, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 14:48:41'),
(1810, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 18:02:56'),
(1811, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 18:56:50'),
(1812, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 18:56:54'),
(1813, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 18:57:43'),
(1814, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-26 18:57:51'),
(1815, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-26 21:54:55'),
(1816, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-27 13:55:54'),
(1817, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:56:25'),
(1818, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-27 13:56:29'),
(1819, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-27 13:56:51'),
(1820, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:56:56'),
(1821, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:56:57'),
(1822, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:57:48'),
(1823, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:57:52'),
(1824, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-27 13:57:55'),
(1825, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-27 13:57:57'),
(1826, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 19:36:10'),
(1827, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 19:36:19'),
(1828, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:36:38'),
(1829, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:36:43'),
(1830, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:36:57'),
(1831, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:02'),
(1832, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:06'),
(1833, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:11'),
(1834, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:13'),
(1835, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:15'),
(1836, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:23'),
(1837, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:24'),
(1838, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:25'),
(1839, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:27'),
(1840, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:27'),
(1841, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:29'),
(1842, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:30'),
(1843, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:33'),
(1844, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:34'),
(1845, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:36'),
(1846, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:37'),
(1847, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:40'),
(1848, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:42'),
(1849, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:43'),
(1850, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:45'),
(1851, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:48'),
(1852, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:48'),
(1853, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:50'),
(1854, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:53'),
(1855, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:54'),
(1856, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:55'),
(1857, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:37:56'),
(1858, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:02'),
(1859, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:05'),
(1860, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:16'),
(1861, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:18'),
(1862, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:18'),
(1863, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:21'),
(1864, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:22'),
(1865, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:25'),
(1866, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:30'),
(1867, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:31'),
(1868, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:32'),
(1869, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:34'),
(1870, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:35'),
(1871, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:39'),
(1872, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:40'),
(1873, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:41'),
(1874, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:42'),
(1875, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:46'),
(1876, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:50'),
(1877, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:52'),
(1878, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:52'),
(1879, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:54'),
(1880, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:54'),
(1881, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:55'),
(1882, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:56'),
(1883, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:57'),
(1884, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:58'),
(1885, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:38:59'),
(1886, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:00'),
(1887, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:01'),
(1888, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:02'),
(1889, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:03'),
(1890, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:03'),
(1891, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:04'),
(1892, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:05'),
(1893, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:06'),
(1894, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:07'),
(1895, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:07'),
(1896, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:08'),
(1897, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:09'),
(1898, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:10'),
(1899, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:11'),
(1900, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:11'),
(1901, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:13'),
(1902, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:14'),
(1903, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:16'),
(1904, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:16'),
(1905, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:17'),
(1906, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:18'),
(1907, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 19:39:35'),
(1908, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:05'),
(1909, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:08'),
(1910, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:10'),
(1911, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:17'),
(1912, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:20'),
(1913, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:36'),
(1914, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:37'),
(1915, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:41'),
(1916, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:43'),
(1917, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:46'),
(1918, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:48'),
(1919, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:50'),
(1920, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:53'),
(1921, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:56'),
(1922, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:03:59'),
(1923, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:04:01'),
(1924, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:04:10'),
(1925, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:04:35'),
(1926, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:04:45'),
(1927, 1, 'You have detroyed -=[ Devolarium ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 32 npc point(s).<br/>You received 32 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:05:06'),
(1928, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:06:19'),
(1929, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:06:45'),
(1930, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:06:47'),
(1931, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:06:50'),
(1932, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:07:00'),
(1933, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:07:08'),
(1934, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 20:30:47'),
(1935, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 20:31:14'),
(1936, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:31:38');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(1937, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 20:31:40'),
(1938, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-05-30 20:31:43'),
(1939, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 20:32:01'),
(1940, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 20:32:05'),
(1941, 1, 'You have detroyed -=[ Boss Saimon ]=-.<br/>You received 9600 credits.<br/>You received 24 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 20:32:13'),
(1942, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 20:32:31'),
(1943, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 20:32:35'),
(1944, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 20:33:02'),
(1945, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 20:35:09'),
(1946, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 21:04:49'),
(1947, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-30 21:04:51'),
(1948, 1, 'You have detroyed -=[ Mordon ]=-.<br/>You received 19200 credits.<br/>You received 24 uridium.<br/>You received 8 npc point(s).<br/>You received 8 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-30 21:05:04'),
(1949, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 21:06:34'),
(1950, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-05-30 21:06:45'),
(1951, 1, 'You have detroyed -=[ Boss Sibelon ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 38 npc point(s).<br/>You received 38 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-30 21:07:13'),
(1952, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:30:28'),
(1953, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:30:43'),
(1954, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:30:44'),
(1955, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:31:06'),
(1956, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:31:18'),
(1957, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:42:06'),
(1958, 3, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-05-30 21:44:11'),
(1959, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 09:37:21'),
(1960, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 09:37:24'),
(1961, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 09:37:26'),
(1962, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-05-31 09:43:37'),
(1963, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-05-31 09:44:16'),
(1964, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-05-31 09:44:17'),
(1965, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-05-31 09:44:29'),
(1966, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-05-31 09:47:31'),
(1967, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 09:58:30'),
(1968, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-05-31 10:37:01'),
(1969, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-05-31 10:37:30'),
(1970, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:38:11'),
(1971, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:38:13'),
(1972, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:14'),
(1973, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:17'),
(1974, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-31 12:38:45'),
(1975, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:48'),
(1976, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:50'),
(1977, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:53'),
(1978, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:57'),
(1979, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:38:59'),
(1980, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:39:02'),
(1981, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-31 12:39:36'),
(1982, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:39:38'),
(1983, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:39:44'),
(1984, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:39:48'),
(1985, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:39:57'),
(1986, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-31 12:40:00'),
(1987, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:40:15'),
(1988, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:40:21'),
(1989, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:40:23'),
(1990, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:40:28'),
(1991, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:40:30'),
(1992, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:40:38'),
(1993, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:40:52'),
(1994, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-05-31 12:41:20'),
(1995, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:41:23'),
(1996, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-31 12:41:39'),
(1997, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:41:51'),
(1998, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:41:54'),
(1999, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:41:56'),
(2000, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:41:58'),
(2001, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-31 12:42:07'),
(2002, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:42:27'),
(2003, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:42:27'),
(2004, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:42:31'),
(2005, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:42:33'),
(2006, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:42:36'),
(2007, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:42:39'),
(2008, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:42:58'),
(2009, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:01'),
(2010, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:04'),
(2011, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:08'),
(2012, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:11'),
(2013, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:20'),
(2014, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:25'),
(2015, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:43:39'),
(2016, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:43:42'),
(2017, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-31 12:43:50'),
(2018, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:43:52'),
(2019, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:44:07'),
(2020, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:44:24'),
(2021, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:44:27'),
(2022, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:44:28'),
(2023, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:44:44'),
(2024, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:44:46'),
(2025, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:44:48'),
(2026, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:44:51'),
(2027, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:44:53'),
(2028, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:44:56'),
(2029, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 12:45:14'),
(2030, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:45:20'),
(2031, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 12:45:22'),
(2032, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:45:24'),
(2033, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-05-31 12:45:36'),
(2034, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 12:45:40'),
(2035, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 22:50:28'),
(2036, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 22:50:43'),
(2037, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 22:50:56'),
(2038, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-05-31 22:51:04'),
(2039, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 22:51:09'),
(2040, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-05-31 22:51:18'),
(2041, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-05-31 22:51:40'),
(2042, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-01 15:53:42'),
(2043, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-01 15:54:00'),
(2044, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-01 15:54:03'),
(2045, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-01 15:54:09'),
(2046, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-01 15:54:13'),
(2047, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-06-02 01:31:41'),
(2048, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-02 01:32:20'),
(2049, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-02 01:32:22'),
(2050, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:32:40'),
(2051, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-06-02 01:32:43'),
(2052, 1, 'You have detroyed -=[ Uber Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 96 npc point(s).<br/>You received 96 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:32:44'),
(2053, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-02 01:32:48'),
(2054, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-02 01:32:49'),
(2055, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-02 01:32:50'),
(2056, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-02 01:32:52'),
(2057, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:33:02'),
(2058, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:33:05'),
(2059, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:33:14'),
(2060, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-02 01:33:32'),
(2061, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-02 01:33:33'),
(2062, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-02 01:33:40'),
(2063, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-02 01:33:44'),
(2064, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:33:52'),
(2065, 1, 'You have detroyed -=[ Uber Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 96 npc point(s).<br/>You received 96 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:33:56'),
(2066, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:34:10'),
(2067, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:34:26'),
(2068, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-02 01:34:36'),
(2069, 1, 'You have detroyed -=[ Uber Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 96 npc point(s).<br/>You received 96 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:34:39'),
(2070, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:09'),
(2071, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:11'),
(2072, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:12'),
(2073, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:14'),
(2074, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:15'),
(2075, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:17'),
(2076, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:19'),
(2077, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:24'),
(2078, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:26'),
(2079, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:28'),
(2080, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:29'),
(2081, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:31'),
(2082, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:32'),
(2083, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:34'),
(2084, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-02 01:35:36'),
(2085, 1, 'You have detroyed -=[ Boss Sibelonit ]=-.<br/>You received 76800 credits.<br/>You received 72 uridium.<br/>You received 48 npc point(s).<br/>You received 48 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-03 02:25:19'),
(2086, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-03 02:29:54'),
(2087, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:36:13'),
(2088, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:36:30'),
(2089, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:36:46'),
(2090, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:36:56'),
(2091, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:37:04'),
(2092, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:37:19'),
(2093, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-03 02:37:24'),
(2094, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-03 02:37:26'),
(2095, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:37:50'),
(2096, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:37:57'),
(2097, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:38:18'),
(2098, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:38:34'),
(2099, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:38:40'),
(2100, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:38:46'),
(2101, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:38:58'),
(2102, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:08'),
(2103, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:12'),
(2104, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:18'),
(2105, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-03 02:39:19'),
(2106, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:21'),
(2107, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:26'),
(2108, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:28'),
(2109, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:32'),
(2110, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:35'),
(2111, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:39'),
(2112, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:42'),
(2113, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:44'),
(2114, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:50'),
(2115, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:54'),
(2116, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:39:59'),
(2117, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:01'),
(2118, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:02'),
(2119, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:06'),
(2120, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:08'),
(2121, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:11'),
(2122, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:13'),
(2123, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:15'),
(2124, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:16'),
(2125, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:20'),
(2126, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:22'),
(2127, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:24'),
(2128, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:26'),
(2129, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:29'),
(2130, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:35'),
(2131, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:38'),
(2132, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:45'),
(2133, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:45'),
(2134, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:49'),
(2135, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:53'),
(2136, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:40:59'),
(2137, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:05'),
(2138, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:09'),
(2139, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:12'),
(2140, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:15'),
(2141, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:18'),
(2142, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:22'),
(2143, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:25'),
(2144, 1, 'Invader destroyed. Rewards received.', '2026-06-03 02:41:30'),
(2145, 1, 'Invasion final reward received.', '2026-06-03 02:41:32'),
(2146, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:24:42'),
(2147, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:25:05'),
(2148, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:25:59'),
(2149, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-04 00:30:34'),
(2150, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:30:38'),
(2151, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:30:54'),
(2152, 1, 'You have detroyed Invader.<br/>You received 0 credits.<br/>You received 0 uridium.<br/>You received 0 npc point(s).<br/>You received 0 rankpoint(s).<br/>You received 0 experience.<br/>You received 0 honor.', '2026-06-04 00:32:38'),
(2153, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-06-04 00:34:18'),
(2154, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-04 00:35:51'),
(2155, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-04 11:13:21'),
(2156, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-04 11:13:48'),
(2157, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-06-04 11:14:41'),
(2158, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-06-04 11:15:20'),
(2159, 1, 'Invader destroyed. Rewards received.', '2026-06-04 11:23:08'),
(2160, 1, 'Invader destroyed. Rewards received.', '2026-06-04 11:23:39'),
(2161, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-06 09:40:02'),
(2162, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-06 09:40:08'),
(2163, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:45:42'),
(2164, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:45:46'),
(2165, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:45:53'),
(2166, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:47:11'),
(2167, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:47:17'),
(2168, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:01');
INSERT INTO `users_log` (`id`, `playerid`, `message`, `timestamp`) VALUES
(2169, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:07'),
(2170, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:11'),
(2171, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:22'),
(2172, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:45'),
(2173, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:52'),
(2174, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:48:56'),
(2175, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:49:03'),
(2176, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:49:10'),
(2177, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-06 09:49:15'),
(2178, 1, 'You have detroyed -=[ Sibelonit ]=-.<br/>You received 38400 credits.<br/>You received 36 uridium.<br/>You received 12 npc point(s).<br/>You received 12 rankpoint(s).<br/>You received 3200 experience.<br/>You received 16 honor.', '2026-06-06 09:49:19'),
(2179, 1, 'You have destroyed -=[ Invader ]=-.<br/>You received 3000000 credits.<br/>You received 25000 uridium.<br/>You received 10000 UCB-100.<br/>You received 5000 RSB-75.<br/>You received 250000 experience.<br/>You received 1250 honor.', '2026-06-06 09:50:00'),
(2180, 1, 'You have detroyed -=[ Lordakium ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 20 npc point(s).<br/>You received 20 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-06-08 21:23:06'),
(2181, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-06-08 21:23:36'),
(2182, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-08 21:23:49'),
(2183, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:24:05'),
(2184, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:24:28'),
(2185, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 21:24:32'),
(2186, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:24:54'),
(2187, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:25:22'),
(2188, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:25:38'),
(2189, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:25:46'),
(2190, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 21:25:57'),
(2191, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:26:16'),
(2192, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:28:21'),
(2193, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-08 21:28:29'),
(2194, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-08 21:28:33'),
(2195, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-08 21:28:36'),
(2196, 1, 'You have detroyed -=[ Uber Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 96 npc point(s).<br/>You received 96 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-08 21:28:39'),
(2197, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:28:47'),
(2198, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:28:58'),
(2199, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 21:29:03'),
(2200, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:11:49'),
(2201, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:12:02'),
(2202, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:12:21'),
(2203, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:12:25'),
(2204, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:12:39'),
(2205, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-08 23:12:41'),
(2206, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-08 23:12:44'),
(2207, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-08 23:12:45'),
(2208, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:12:46'),
(2209, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:13:09'),
(2210, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-08 23:13:11'),
(2211, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-08 23:13:12'),
(2212, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:13:14'),
(2213, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:13:27'),
(2214, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:13:42'),
(2215, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:13:58'),
(2216, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:14:06'),
(2217, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-08 23:14:13'),
(2218, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:14:23'),
(2219, 1, 'You have detroyed -=[ Cubikon ]=-.<br/>You received 4915200 credits.<br/>You received 3072 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 512000 experience.<br/>You received 4096 honor.', '2026-06-08 23:15:59'),
(2220, 1, 'You have detroyed -=[ Kristallon ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 28 npc point(s).<br/>You received 28 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-06-08 23:16:06'),
(2221, 1, 'You have detroyed -=[ Kristallin ]=-.<br/>You received 38400 credits.<br/>You received 48 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 6400 experience.<br/>You received 32 honor.', '2026-06-08 23:41:07'),
(2222, 1, 'You have detroyed -=[ Boss Kristallon ]=-.<br/>You received 2457600 credits.<br/>You received 768 uridium.<br/>You received 56 npc point(s).<br/>You received 56 rankpoint(s).<br/>You received 102400 experience.<br/>You received 512 honor.', '2026-06-08 23:41:16'),
(2223, 1, 'You have detroyed -=[ Cubikon ]=-.<br/>You received 4915200 credits.<br/>You received 3072 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 512000 experience.<br/>You received 4096 honor.', '2026-06-08 23:41:38'),
(2224, 1, 'You have detroyed -=[ Boss Lordakium ]=-.<br/>You received 1228800 credits.<br/>You received 384 uridium.<br/>You received 80 npc point(s).<br/>You received 80 rankpoint(s).<br/>You received 51200 experience.<br/>You received 256 honor.', '2026-06-08 23:42:05'),
(2225, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:42:40'),
(2226, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:42:50'),
(2227, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:00'),
(2228, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:10'),
(2229, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:21'),
(2230, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:36'),
(2231, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:45'),
(2232, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:43:55'),
(2233, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:44:39'),
(2234, 1, 'You have detroyed -=[ Cubikon ]=-.<br/>You received 4915200 credits.<br/>You received 3072 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 512000 experience.<br/>You received 4096 honor.', '2026-06-08 23:45:59'),
(2235, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 48000000 credits.<br/>You received 48000 uridium.<br/>You received 200 npc point(s).<br/>You received 200 rankpoint(s).<br/>You received 200 experience.<br/>You received 20 honor.', '2026-06-08 23:47:17'),
(2236, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-09 10:38:54'),
(2237, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 10:39:20'),
(2238, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 10:39:22'),
(2239, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-09 10:39:43'),
(2240, 1, 'You have detroyed -=[ Boss Protegit ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 45 npc point(s).<br/>You received 45 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 10:39:45'),
(2241, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 10:39:50'),
(2242, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 10:40:16'),
(2243, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 12:31:24'),
(2244, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-09 12:32:00'),
(2245, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-09 12:34:04'),
(2246, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-09 12:34:47'),
(2247, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 12:34:57'),
(2248, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 12:37:23'),
(2249, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-09 12:37:24'),
(2250, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 17:15:58'),
(2251, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-09 17:16:09'),
(2252, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-09 17:16:23'),
(2253, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 17:17:44'),
(2254, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 17:17:54'),
(2255, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 17:17:57'),
(2256, 1, 'You have detroyed -=[ Uber Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 57 npc point(s).<br/>You received 57 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-06-09 17:18:16'),
(2257, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-09 17:18:24'),
(2258, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-09 17:21:20'),
(2259, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-06-09 18:02:03'),
(2260, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-09 18:02:09'),
(2261, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 18:02:12'),
(2262, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-09 18:02:14'),
(2263, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-09 18:02:20'),
(2264, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 18:02:29'),
(2265, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 18:02:34'),
(2266, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-09 18:02:47'),
(2267, 1, 'You have detroyed -=[ Uber StreuneR ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 18:02:52'),
(2268, 1, 'You have detroyed -=[ Uber Sibelon ]=-.<br/>You received 921600 credits.<br/>You received 288 uridium.<br/>You received 57 npc point(s).<br/>You received 57 rankpoint(s).<br/>You received 38400 experience.<br/>You received 192 honor.', '2026-06-09 18:03:37'),
(2269, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-09 18:03:39'),
(2270, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-09 18:03:48'),
(2271, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-09 18:04:10'),
(2272, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 23:27:41'),
(2273, 1, 'You have detroyed -=[ Uber Mordon ]=-.<br/>You received 57600 credits.<br/>You received 72 uridium.<br/>You received 24 npc point(s).<br/>You received 24 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 23:28:21'),
(2274, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-09 23:28:22'),
(2275, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-09 23:29:22'),
(2276, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-10 14:03:55'),
(2277, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-10 14:04:20'),
(2278, 1, 'You have detroyed -=[ Uber Streuner ]=-.<br/>You received 3600 credits.<br/>You received 9 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1200 experience.<br/>You received 6 honor.', '2026-06-10 23:27:54'),
(2279, 1, 'You have detroyed -=[ Boss Cubikon ]=-.<br/>You received 19660800 credits.<br/>You received 12288 uridium.<br/>You received 100 npc point(s).<br/>You received 100 rankpoint(s).<br/>You received 2048000 experience.<br/>You received 16384 honor.', '2026-06-11 10:31:44'),
(2280, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-11 10:32:19'),
(2281, 1, 'You have detroyed -=[ Uber Devolarium ]=-.<br/>You received 460800 credits.<br/>You received 144 uridium.<br/>You received 96 npc point(s).<br/>You received 96 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-11 10:32:23'),
(2282, 1, 'You have detroyed -=[ Uber Kristallin ]=-.<br/>You received 115200 credits.<br/>You received 144 uridium.<br/>You received 18 npc point(s).<br/>You received 18 rankpoint(s).<br/>You received 19200 experience.<br/>You received 96 honor.', '2026-06-11 10:32:42'),
(2283, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-06-11 10:32:48'),
(2284, 1, 'You have detroyed -=[ Uber Kristallon ]=-.<br/>You received 3686400 credits.<br/>You received 1152 uridium.<br/>You received 84 npc point(s).<br/>You received 84 rankpoint(s).<br/>You received 153600 experience.<br/>You received 768 honor.', '2026-06-11 10:32:54'),
(2285, 1, 'You have detroyed -=[ Uber Sibelonit ]=-.<br/>You received 115200 credits.<br/>You received 108 uridium.<br/>You received 36 npc point(s).<br/>You received 36 rankpoint(s).<br/>You received 9600 experience.<br/>You received 48 honor.', '2026-06-11 11:37:20'),
(2286, 1, 'You have detroyed -=[ Uber Lordakium ]=-.<br/>You received 1843200 credits.<br/>You received 576 uridium.<br/>You received 60 npc point(s).<br/>You received 60 rankpoint(s).<br/>You received 76800 experience.<br/>You received 384 honor.', '2026-06-12 10:27:24'),
(2287, 1, 'You have detroyed -=[ Uber Lordakia ]=-.<br/>You received 7200 credits.<br/>You received 18 uridium.<br/>You received 6 npc point(s).<br/>You received 6 rankpoint(s).<br/>You received 2400 experience.<br/>You received 12 honor.', '2026-06-12 10:27:25'),
(2288, 1, 'You have detroyed -=[ Uber Saimon ]=-.<br/>You received 14400 credits.<br/>You received 36 uridium.<br/>You received 9 npc point(s).<br/>You received 9 rankpoint(s).<br/>You received 4800 experience.<br/>You received 24 honor.', '2026-06-12 10:27:27'),
(2289, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 16:56:59'),
(2290, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:04:18'),
(2291, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:04:20'),
(2292, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:04:22'),
(2293, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:04:58'),
(2294, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:07:44'),
(2295, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:07:47'),
(2296, 1, 'You have detroyed -=[ Boss Streuner ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:07:54'),
(2297, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:07:56'),
(2298, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:07:59'),
(2299, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:02'),
(2300, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:05'),
(2301, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:08:09'),
(2302, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:08:12'),
(2303, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:14'),
(2304, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:08:18'),
(2305, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:20'),
(2306, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:25'),
(2307, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:32'),
(2308, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:34'),
(2309, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:53'),
(2310, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:55'),
(2311, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:08:59'),
(2312, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:09:01'),
(2313, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:09:03'),
(2314, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:05'),
(2315, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:07'),
(2316, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:14'),
(2317, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:09:18'),
(2318, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:20'),
(2319, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:09:22'),
(2320, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:24'),
(2321, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:09:26'),
(2322, 1, 'You have detroyed -=[ Streuner ]=-.<br/>You received 1200 credits.<br/>You received 3 uridium.<br/>You received 1 npc point(s).<br/>You received 1 rankpoint(s).<br/>You received 400 experience.<br/>You received 2 honor.', '2026-06-12 17:09:34'),
(2323, 1, 'You have detroyed -=[ Boss Lordakia ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 4 npc point(s).<br/>You received 4 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:09:47'),
(2324, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:09:49'),
(2325, 1, 'You have detroyed -=[ Sibelon ]=-.<br/>You received 307200 credits.<br/>You received 96 uridium.<br/>You received 19 npc point(s).<br/>You received 19 rankpoint(s).<br/>You received 12800 experience.<br/>You received 64 honor.', '2026-06-12 17:10:14'),
(2326, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:10:48'),
(2327, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:10:51'),
(2328, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:11:07'),
(2329, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:11:27'),
(2330, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:11:33'),
(2331, 1, 'You have detroyed -=[ Lordakia ]=-.<br/>You received 2400 credits.<br/>You received 6 uridium.<br/>You received 2 npc point(s).<br/>You received 2 rankpoint(s).<br/>You received 800 experience.<br/>You received 4 honor.', '2026-06-12 17:11:36'),
(2332, 1, 'You have detroyed -=[ Boss Sibelon ]=-.<br/>You received 614400 credits.<br/>You received 192 uridium.<br/>You received 38 npc point(s).<br/>You received 38 rankpoint(s).<br/>You received 25600 experience.<br/>You received 128 honor.', '2026-06-12 17:12:06'),
(2333, 1, 'You have detroyed -=[ Saimon ]=-.<br/>You received 4800 credits.<br/>You received 12 uridium.<br/>You received 3 npc point(s).<br/>You received 3 rankpoint(s).<br/>You received 1600 experience.<br/>You received 8 honor.', '2026-06-12 17:19:45');

-- --------------------------------------------------------

--
-- Structure de la table `users_npc_counts`
--

CREATE TABLE `users_npc_counts` (
  `id` int(11) NOT NULL,
  `Streuner` int(11) NOT NULL DEFAULT 0,
  `Lordakia` int(11) NOT NULL DEFAULT 0,
  `Saimon` int(11) NOT NULL DEFAULT 0,
  `Sibelon` int(11) NOT NULL DEFAULT 0,
  `Kristallin` int(11) NOT NULL DEFAULT 0,
  `Kristallon` int(11) NOT NULL DEFAULT 0,
  `Cubikon` int(11) NOT NULL DEFAULT 0,
  `IceMeteroid` int(11) NOT NULL DEFAULT 0,
  `Melter` int(11) NOT NULL DEFAULT 0,
  `Scorcher` int(11) NOT NULL DEFAULT 0,
  `BossCurcubitor` int(11) NOT NULL DEFAULT 0,
  `Hitac` int(11) NOT NULL DEFAULT 0,
  `Devourer` int(11) NOT NULL DEFAULT 0,
  `BossKuKu` int(11) NOT NULL DEFAULT 0,
  `Saboteur` int(11) NOT NULL DEFAULT 0,
  `Annihilator` int(11) NOT NULL DEFAULT 0,
  `Battleray` int(11) NOT NULL DEFAULT 0,
  `Mordon` int(11) NOT NULL DEFAULT 0,
  `Devolarium` int(11) NOT NULL DEFAULT 0,
  `Sibelonit` int(11) NOT NULL DEFAULT 0,
  `Lordakium` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users_npc_counts`
--

INSERT INTO `users_npc_counts` (`id`, `Streuner`, `Lordakia`, `Saimon`, `Sibelon`, `Kristallin`, `Kristallon`, `Cubikon`, `IceMeteroid`, `Melter`, `Scorcher`, `BossCurcubitor`, `Hitac`, `Devourer`, `BossKuKu`, `Saboteur`, `Annihilator`, `Battleray`, `Mordon`, `Devolarium`, `Sibelonit`, `Lordakium`) VALUES
(1, 375, 459, 341, 40, 269, 81, 92, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 51, 290, 69),
(2, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(3, 50, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `users_npc_lvl`
--

CREATE TABLE `users_npc_lvl` (
  `id` int(11) NOT NULL,
  `Streuner` int(11) NOT NULL DEFAULT 0,
  `Lordakia` int(11) NOT NULL DEFAULT 0,
  `Saimon` int(11) NOT NULL DEFAULT 0,
  `Sibelon` int(11) NOT NULL DEFAULT 0,
  `Kristallin` int(11) NOT NULL DEFAULT 0,
  `Kristallon` int(11) NOT NULL DEFAULT 0,
  `Cubikon` int(11) NOT NULL DEFAULT 0,
  `IceMeteroid` int(11) NOT NULL DEFAULT 0,
  `Melter` int(11) NOT NULL DEFAULT 0,
  `Scorcher` int(11) NOT NULL DEFAULT 0,
  `BossCurcubitor` int(11) NOT NULL DEFAULT 0,
  `Hitac` int(11) DEFAULT 0,
  `Devourer` int(11) NOT NULL DEFAULT 0,
  `BossKuKu` int(11) NOT NULL DEFAULT 0,
  `Saboteur` int(11) NOT NULL DEFAULT 0,
  `Annihilator` int(11) NOT NULL DEFAULT 0,
  `Battleray` int(11) NOT NULL DEFAULT 0,
  `Mordon` int(11) NOT NULL DEFAULT 0,
  `Devolarium` int(11) NOT NULL DEFAULT 0,
  `Sibelonit` int(11) NOT NULL DEFAULT 0,
  `Lordakium` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users_npc_lvl`
--

INSERT INTO `users_npc_lvl` (`id`, `Streuner`, `Lordakia`, `Saimon`, `Sibelon`, `Kristallin`, `Kristallon`, `Cubikon`, `IceMeteroid`, `Melter`, `Scorcher`, `BossCurcubitor`, `Hitac`, `Devourer`, `BossKuKu`, `Saboteur`, `Annihilator`, `Battleray`, `Mordon`, `Devolarium`, `Sibelonit`, `Lordakium`) VALUES
(1, 2, 2, 2, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 2, 1),
(2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `users_settings`
--

CREATE TABLE `users_settings` (
  `id` int(11) NOT NULL,
  `playerid` int(11) NOT NULL,
  `flash_set` varchar(250) NOT NULL DEFAULT '1|1|1|1|1|1|1|1|1|1|1|1|1|1|1|0|0|1|1|0|0|1|1|1|1',
  `minimap_scale` varchar(20) NOT NULL DEFAULT '0,11',
  `resizable_windows` varchar(100) NOT NULL,
  `display_player_names` tinyint(1) NOT NULL DEFAULT 1,
  `display_chat` tinyint(1) NOT NULL DEFAULT 1,
  `play_music` tinyint(1) NOT NULL DEFAULT 1,
  `play_sfx` tinyint(1) NOT NULL DEFAULT 1,
  `bar_status` varchar(255) NOT NULL DEFAULT '23,0,24,0,25,1,26,0,27,0',
  `window_settings` varchar(255) NOT NULL DEFAULT '0|0,9,4,1,1,232,3,1,3,780,388,1,5,5,5,0,10,5,288,0,13,187,50,0,20,5,402,1,22,347,188,0,23,458,1,1,24,284,25,0',
  `client_resolution` varchar(255) NOT NULL DEFAULT '0,820,600|1',
  `auto_refinement` tinyint(1) NOT NULL DEFAULT 0,
  `quickslot_stop_attack` tinyint(1) NOT NULL DEFAULT 1,
  `doubleclick_attack` tinyint(1) NOT NULL DEFAULT 1,
  `auto_start` tinyint(1) NOT NULL DEFAULT 1,
  `display_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `show_drones` tinyint(1) NOT NULL DEFAULT 1,
  `display_window_background` tinyint(1) NOT NULL DEFAULT 1,
  `always_draggable_windows` tinyint(1) NOT NULL DEFAULT 1,
  `preload_user_ships` tinyint(1) NOT NULL DEFAULT 1,
  `quality_presetting` int(11) NOT NULL DEFAULT 3,
  `quality_customized` int(11) NOT NULL DEFAULT 3,
  `quality_background` int(11) NOT NULL DEFAULT 3,
  `quality_poizone` int(11) NOT NULL DEFAULT 3,
  `quality_ship` int(11) NOT NULL DEFAULT 3,
  `quality_engine` int(11) NOT NULL DEFAULT 3,
  `quality_collectable` int(11) NOT NULL DEFAULT 3,
  `quality_attack` int(11) NOT NULL DEFAULT 3,
  `quality_effect` int(11) NOT NULL DEFAULT 3,
  `quality_explosion` int(11) NOT NULL DEFAULT 3,
  `quickbar_slot` varchar(255) NOT NULL DEFAULT '6,39,7,45,17,16,-1,-1,-1,-1',
  `mainmenu_position` varchar(255) NOT NULL,
  `slotmenu_position` varchar(20) NOT NULL DEFAULT '313,451',
  `slotmenu_order` varchar(255) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `users_settings`
--

INSERT INTO `users_settings` (`id`, `playerid`, `flash_set`, `minimap_scale`, `resizable_windows`, `display_player_names`, `display_chat`, `play_music`, `play_sfx`, `bar_status`, `window_settings`, `client_resolution`, `auto_refinement`, `quickslot_stop_attack`, `doubleclick_attack`, `auto_start`, `display_notifications`, `show_drones`, `display_window_background`, `always_draggable_windows`, `preload_user_ships`, `quality_presetting`, `quality_customized`, `quality_background`, `quality_poizone`, `quality_ship`, `quality_engine`, `quality_collectable`, `quality_attack`, `quality_effect`, `quality_explosion`, `quickbar_slot`, `mainmenu_position`, `slotmenu_position`, `slotmenu_order`) VALUES
(1, 1, '1|1|1|1|1|1|1|1|1|1|1|1|0|1|1|5|3|1|1|0|0|1|1|1|1', '6', '', 1, 1, 0, 1, '23,0,24,0,25,1,26,0,27,0', '0|0,316,33,1,1,46,22,1,3,1527,800,1,5,821,113,0,10,962,199,0,13,1220,120,0,15,137,163,0,16,883,113,1,20,18,751,1,23,620,40,1,24,1134,114,0', '0,820,600|1', 1, 1, 1, 1, 1, 0, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, '3,4,72,6,7,39,16,17,45,23', '0|318,503', '0|794,880', '0'),
(2, 2, '1|1|1|1|1|1|1|1|1|1|1|1|0|1|1|1|3|1|1|0|0|1|1|1|1', '5', '', 1, 1, 0, 1, '23,0,24,0,25,1,26,0,27,0', '0|0,9,4,1,1,232,3,1,3,780,388,1,5,5,5,0,10,5,288,0,13,187,50,0,20,5,402,1,22,347,188,0,23,458,1,1,24,284,25,0', '0,820,600|1', 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, '6,39,7,45,17,16,-1,-1,-1,-1', '', '0|771,927', '0'),
(3, 3, '1|1|1|1|1|1|1|1|1|1|1|0|0|1|1|4|2|1|1|0|0|1|1|1|1', '5', '', 1, 1, 0, 0, '23,0,24,0,25,1,26,0,27,0', '0|0,9,4,1,1,232,3,1,3,1467,744,1,5,565,49,1,10,1000,19,0,13,704,189,0,15,427,407,0,16,628,193,1,20,3,831,1,23,1156,139,1,24,1238,242,0', '0,820,600|1', 0, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, '3,4,7,45,17,16,-1,-1,-1,-1', '', '0|790,896', '0'),
(4, 4, '1|1|1|1|1|1|1|1|1|1|1|0|0|1|1|0|0|1|1|0|0|1|1|1|1', '7', '', 1, 1, 0, 0, '23,0,24,0,25,1,26,0,27,0', '8|0,376,6,0,1,601,6,1,3,1300,624,1,5,10,10,1,13,520,265,0,15,958,6,0,16,1084,311,1,20,7,544,1,23,1060,131,1,24,613,263,0', '8,1680,1050|1', 0, 1, 1, 1, 1, 0, 1, 1, 1, 3, 1, 0, 3, 3, 3, 3, 3, 3, 3, '6,39,7,45,17,16,-1,-1,-1,-1', '8|399,890', '8|395,855', '0');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `auction_bids`
--
ALTER TABLE `auction_bids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lot_created` (`lot_id`,`created_at`),
  ADD KEY `idx_player_created` (`player_id`,`created_at`);

--
-- Index pour la table `auction_items`
--
ALTER TABLE `auction_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_enabled_sort` (`enabled`,`sort_order`);

--
-- Index pour la table `auction_lots`
--
ALTER TABLE `auction_lots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_round_item` (`round_id`,`auction_item_id`),
  ADD KEY `idx_round` (`round_id`),
  ADD KEY `idx_bidder` (`current_bidder_id`),
  ADD KEY `idx_settled` (`settled`);

--
-- Index pour la table `auction_rounds`
--
ALTER TABLE `auction_rounds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `round_key` (`round_key`),
  ADD KEY `idx_status_ends` (`status`,`ends_at`),
  ADD KEY `idx_starts` (`starts_at`);

--
-- Index pour la table `auction_wins`
--
ALTER TABLE `auction_wins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `lot_id` (`lot_id`),
  ADD KEY `idx_player_created` (`player_id`,`created_at`),
  ADD KEY `idx_round` (`round_id`);

--
-- Index pour la table `bans`
--
ALTER TABLE `bans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bans_expire` (`timestamp_expire`);

--
-- Index pour la table `chatrooms`
--
ALTER TABLE `chatrooms`
  ADD UNIQUE KEY `Id` (`Id`),
  ADD UNIQUE KEY `Index` (`Index`);

--
-- Index pour la table `chat_bans`
--
ALTER TABLE `chat_bans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_bans_expire` (`timestamp_expire`);

--
-- Index pour la table `chat_channel`
--
ALTER TABLE `chat_channel`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `chat_whispers`
--
ALTER TABLE `chat_whispers`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clan`
--
ALTER TABLE `clan`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clan_diplomacy`
--
ALTER TABLE `clan_diplomacy`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clan_diplomacy_clan_type` (`clan_id`,`type`),
  ADD KEY `idx_clan_diplomacy_second_type` (`second_clan_id`,`type`);

--
-- Index pour la table `clan_diplomacy_request`
--
ALTER TABLE `clan_diplomacy_request`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clan_log`
--
ALTER TABLE `clan_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clan` (`clan_id`,`created_at`),
  ADD KEY `idx_actor` (`actor_user_id`,`created_at`);

--
-- Index pour la table `clan_messages`
--
ALTER TABLE `clan_messages`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clan_request`
--
ALTER TABLE `clan_request`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clan_rights`
--
ALTER TABLE `clan_rights`
  ADD PRIMARY KEY (`rights_id`);

--
-- Index pour la table `clan_roles`
--
ALTER TABLE `clan_roles`
  ADD PRIMARY KEY (`clan_id`,`user_id`),
  ADD UNIQUE KEY `uniq_clan_user` (`clan_id`,`user_id`),
  ADD KEY `idx_roles_user` (`user_id`),
  ADD KEY `idx_roles_clan` (`clan_id`);

--
-- Index pour la table `clan_tax_ledger`
--
ALTER TABLE `clan_tax_ledger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clan_date` (`clan_id`,`run_date`),
  ADD KEY `idx_user_date` (`user_id`,`run_date`);

--
-- Index pour la table `clan_tax_settings`
--
ALTER TABLE `clan_tax_settings`
  ADD PRIMARY KEY (`clan_id`),
  ADD KEY `fk_taxset_upd` (`updated_by`);

--
-- Index pour la table `clan_transfers`
--
ALTER TABLE `clan_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transfers_clan` (`clan_id`),
  ADD KEY `fk_transfers_actor` (`actor_user_id`),
  ADD KEY `fk_transfers_to` (`to_user_id`);

--
-- Index pour la table `clan_wallet`
--
ALTER TABLE `clan_wallet`
  ADD PRIMARY KEY (`clan_id`);

--
-- Index pour la table `coupon`
--
ALTER TABLE `coupon`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `drone`
--
ALTER TABLE `drone`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `player_id` (`player_id`,`name`);

--
-- Index pour la table `drone_config_slot`
--
ALTER TABLE `drone_config_slot`
  ADD PRIMARY KEY (`player_id`,`config`,`drone_index`,`slot_index`);

--
-- Index pour la table `drone_design_equipped`
--
ALTER TABLE `drone_design_equipped`
  ADD PRIMARY KEY (`drone_id`),
  ADD KEY `idx_design_item_id` (`design_item_id`);

--
-- Index pour la table `drone_slot`
--
ALTER TABLE `drone_slot`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `drone_id` (`drone_id`,`slot_index`);

--
-- Index pour la table `drone_slot_config`
--
ALTER TABLE `drone_slot_config`
  ADD PRIMARY KEY (`drone_id`,`config`,`slot_index`),
  ADD KEY `idx_drone_config` (`drone_id`,`config`);

--
-- Index pour la table `invite_code`
--
ALTER TABLE `invite_code`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `lottery_logs`
--
ALTER TABLE `lottery_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `maps`
--
ALTER TABLE `maps`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `moderation_action_log`
--
ALTER TABLE `moderation_action_log`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `name_change`
--
ALTER TABLE `name_change`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `player_cargo`
--
ALTER TABLE `player_cargo`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `player_config`
--
ALTER TABLE `player_config`
  ADD PRIMARY KEY (`player_id`);

--
-- Index pour la table `player_designs`
--
ALTER TABLE `player_designs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `player_id` (`player_id`,`design_id`);

--
-- Index pour la table `player_galaxy_gates`
--
ALTER TABLE `player_galaxy_gates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_gate_unique` (`user_id`,`gate_id`);

--
-- Index pour la table `player_inventory`
--
ALTER TABLE `player_inventory`
  ADD PRIMARY KEY (`player_id`,`item_id`);

--
-- Index pour la table `player_reff`
--
ALTER TABLE `player_reff`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `player_seprom_safe`
--
ALTER TABLE `player_seprom_safe`
  ADD PRIMARY KEY (`player_id`);

--
-- Index pour la table `player_titles`
--
ALTER TABLE `player_titles`
  ADD PRIMARY KEY (`player_id`,`title_key`),
  ADD KEY `idx_player_titles_active` (`player_id`,`revoked_at`,`expires_at`),
  ADD KEY `idx_player_titles_key` (`title_key`);

--
-- Index pour la table `player_title_progress`
--
ALTER TABLE `player_title_progress`
  ADD PRIMARY KEY (`player_id`,`progress_key`),
  ADD KEY `idx_title_progress_key` (`progress_key`);

--
-- Index pour la table `player_title_selection`
--
ALTER TABLE `player_title_selection`
  ADD PRIMARY KEY (`player_id`);

--
-- Index pour la table `portals`
--
ALTER TABLE `portals`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `role_clan`
--
ALTER TABLE `role_clan`
  ADD PRIMARY KEY (`role_id`);

--
-- Index pour la table `server_statistics`
--
ALTER TABLE `server_statistics`
  ADD PRIMARY KEY (`skey`);

--
-- Index pour la table `ship_config`
--
ALTER TABLE `ship_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_player_ship_name` (`player_id`,`ship_design_id`,`name`);

--
-- Index pour la table `ship_config_stats`
--
ALTER TABLE `ship_config_stats`
  ADD PRIMARY KEY (`ship_config_id`);

--
-- Index pour la table `ship_design`
--
ALTER TABLE `ship_design`
  ADD PRIMARY KEY (`ship_design_id`);

--
-- Index pour la table `ship_slot`
--
ALTER TABLE `ship_slot`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ship_config_id` (`ship_config_id`,`row_name`,`slot_index`),
  ADD UNIQUE KEY `uq_ship_slot` (`ship_config_id`,`row_name`,`slot_index`);

--
-- Index pour la table `site_daily_login_claims`
--
ALTER TABLE `site_daily_login_claims`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_daily_login_player_week_day` (`player_id`,`week_key`,`day_number`),
  ADD UNIQUE KEY `uniq_daily_login_player_claim_date` (`player_id`,`claim_date`),
  ADD KEY `idx_daily_login_player_week` (`player_id`,`week_key`);

--
-- Index pour la table `site_player_quests`
--
ALTER TABLE `site_player_quests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_player_quest` (`player_id`,`quest_id`),
  ADD KEY `idx_player_status` (`player_id`,`status`);

--
-- Index pour la table `site_player_quest_objective_progress`
--
ALTER TABLE `site_player_quest_objective_progress`
  ADD PRIMARY KEY (`player_id`,`quest_id`,`objective_type`,`target_key`),
  ADD KEY `idx_player_quest` (`player_id`,`quest_id`),
  ADD KEY `idx_player_objective` (`player_id`,`objective_type`,`target_key`);

--
-- Index pour la table `site_player_weekly_missions`
--
ALTER TABLE `site_player_weekly_missions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_player_weekly_mission` (`player_id`,`mission_id`,`week_key`),
  ADD KEY `idx_player_week_status` (`player_id`,`week_key`,`status`),
  ADD KEY `idx_weekly_mission_week` (`mission_id`,`week_key`);

--
-- Index pour la table `site_player_weekly_mission_progress`
--
ALTER TABLE `site_player_weekly_mission_progress`
  ADD PRIMARY KEY (`player_id`,`mission_id`,`week_key`,`objective_type`,`target_key`),
  ADD KEY `idx_weekly_progress_player` (`player_id`,`week_key`),
  ADD KEY `idx_weekly_progress_objective` (`objective_type`,`target_key`);

--
-- Index pour la table `site_purchase_log`
--
ALTER TABLE `site_purchase_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_player_created` (`player_id`,`created_at`),
  ADD KEY `idx_status_created` (`status`,`created_at`),
  ADD KEY `idx_source_created` (`source`,`created_at`);

--
-- Index pour la table `site_quests`
--
ALTER TABLE `site_quests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_enabled_sort` (`enabled`,`sort_order`);

--
-- Index pour la table `site_quest_objectives`
--
ALTER TABLE `site_quest_objectives`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quest_sort` (`quest_id`,`sort_order`);

--
-- Index pour la table `site_quest_ore_counts`
--
ALTER TABLE `site_quest_ore_counts`
  ADD PRIMARY KEY (`player_id`);

--
-- Index pour la table `site_weekly_missions`
--
ALTER TABLE `site_weekly_missions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_weekly_rotation` (`enabled`,`rotation_group`,`slot`);

--
-- Index pour la table `site_weekly_mission_objectives`
--
ALTER TABLE `site_weekly_mission_objectives`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_weekly_mission_sort` (`mission_id`,`sort_order`),
  ADD KEY `idx_weekly_objective` (`objective_type`,`target_key`);

--
-- Index pour la table `speedhack_detect`
--
ALTER TABLE `speedhack_detect`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `title_runtime_state`
--
ALTER TABLE `title_runtime_state`
  ADD PRIMARY KEY (`state_key`),
  ADD KEY `idx_title_runtime_holder_player` (`holder_player_id`),
  ADD KEY `idx_title_runtime_holder_npc` (`holder_npc_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_in_fight_until` (`in_fight_until`),
  ADD KEY `idx_users_auth_ticket` (`AuthTicket`),
  ADD KEY `idx_users_username` (`username`);

--
-- Index pour la table `users_infos`
--
ALTER TABLE `users_infos`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users_log`
--
ALTER TABLE `users_log`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users_npc_counts`
--
ALTER TABLE `users_npc_counts`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users_npc_lvl`
--
ALTER TABLE `users_npc_lvl`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users_settings`
--
ALTER TABLE `users_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `playerid` (`playerid`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `auction_bids`
--
ALTER TABLE `auction_bids`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `auction_items`
--
ALTER TABLE `auction_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2215;

--
-- AUTO_INCREMENT pour la table `auction_lots`
--
ALTER TABLE `auction_lots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=630;

--
-- AUTO_INCREMENT pour la table `auction_rounds`
--
ALTER TABLE `auction_rounds`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `auction_wins`
--
ALTER TABLE `auction_wins`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `bans`
--
ALTER TABLE `bans`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `chat_bans`
--
ALTER TABLE `chat_bans`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `chat_channel`
--
ALTER TABLE `chat_channel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `chat_whispers`
--
ALTER TABLE `chat_whispers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clan`
--
ALTER TABLE `clan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `clan_diplomacy`
--
ALTER TABLE `clan_diplomacy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clan_diplomacy_request`
--
ALTER TABLE `clan_diplomacy_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clan_log`
--
ALTER TABLE `clan_log`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `clan_messages`
--
ALTER TABLE `clan_messages`
  MODIFY `id` int(64) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clan_request`
--
ALTER TABLE `clan_request`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `clan_tax_ledger`
--
ALTER TABLE `clan_tax_ledger`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clan_transfers`
--
ALTER TABLE `clan_transfers`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `coupon`
--
ALTER TABLE `coupon`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `drone`
--
ALTER TABLE `drone`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `drone_slot`
--
ALTER TABLE `drone_slot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2216;

--
-- AUTO_INCREMENT pour la table `invite_code`
--
ALTER TABLE `invite_code`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `items`
--
ALTER TABLE `items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9002;

--
-- AUTO_INCREMENT pour la table `lottery_logs`
--
ALTER TABLE `lottery_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `moderation_action_log`
--
ALTER TABLE `moderation_action_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `name_change`
--
ALTER TABLE `name_change`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `player_designs`
--
ALTER TABLE `player_designs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `player_galaxy_gates`
--
ALTER TABLE `player_galaxy_gates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=950;

--
-- AUTO_INCREMENT pour la table `portals`
--
ALTER TABLE `portals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=414;

--
-- AUTO_INCREMENT pour la table `role_clan`
--
ALTER TABLE `role_clan`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `ship_config`
--
ALTER TABLE `ship_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=415;

--
-- AUTO_INCREMENT pour la table `ship_slot`
--
ALTER TABLE `ship_slot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3691;

--
-- AUTO_INCREMENT pour la table `site_daily_login_claims`
--
ALTER TABLE `site_daily_login_claims`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `site_player_quests`
--
ALTER TABLE `site_player_quests`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `site_player_weekly_missions`
--
ALTER TABLE `site_player_weekly_missions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=294;

--
-- AUTO_INCREMENT pour la table `site_purchase_log`
--
ALTER TABLE `site_purchase_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT pour la table `site_quests`
--
ALTER TABLE `site_quests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90746;

--
-- AUTO_INCREMENT pour la table `site_quest_objectives`
--
ALTER TABLE `site_quest_objectives`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94441;

--
-- AUTO_INCREMENT pour la table `site_weekly_missions`
--
ALTER TABLE `site_weekly_missions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `site_weekly_mission_objectives`
--
ALTER TABLE `site_weekly_mission_objectives`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;

--
-- AUTO_INCREMENT pour la table `speedhack_detect`
--
ALTER TABLE `speedhack_detect`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `users_log`
--
ALTER TABLE `users_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2334;

--
-- AUTO_INCREMENT pour la table `users_settings`
--
ALTER TABLE `users_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `clan_log`
--
ALTER TABLE `clan_log`
  ADD CONSTRAINT `fk_log_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_log_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `clan_tax_ledger`
--
ALTER TABLE `clan_tax_ledger`
  ADD CONSTRAINT `fk_taxledger_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_taxledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `clan_tax_settings`
--
ALTER TABLE `clan_tax_settings`
  ADD CONSTRAINT `fk_taxset_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_taxset_upd` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `clan_transfers`
--
ALTER TABLE `clan_transfers`
  ADD CONSTRAINT `fk_transfers_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transfers_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transfers_to` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `clan_wallet`
--
ALTER TABLE `clan_wallet`
  ADD CONSTRAINT `fk_wallet_clan` FOREIGN KEY (`clan_id`) REFERENCES `clan` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `lottery_logs`
--
ALTER TABLE `lottery_logs`
  ADD CONSTRAINT `lottery_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
