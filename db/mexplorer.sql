-- phpMyAdmin SQL Dump
-- version 4.4.15.5
-- http://www.phpmyadmin.net
--
-- Vært: localhost:3306
-- Genereringstid: 09. 12 2016 kl. 14:34:18
-- Serverversion: 5.5.49-log
-- PHP-version: 7.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mexplorer`
--

-- --------------------------------------------------------

--
-- Struktur-dump for tabellen `image`
--

CREATE TABLE IF NOT EXISTS `image` (
  `id` int(11) NOT NULL,
  `mapillary_key` char(32) COLLATE utf8_bin NOT NULL,
  `ca` float DEFAULT NULL,
  `lat` float DEFAULT NULL,
  `lon` float DEFAULT NULL,
  `username` varchar(255) COLLATE utf8_bin NOT NULL,
  `captured_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Struktur-dump for tabellen `tag`
--

CREATE TABLE IF NOT EXISTS `tag` (
  `id` int(11) NOT NULL,
  `image` int(11) NOT NULL,
  `keytext` char(64) COLLATE utf8_bin NOT NULL,
  `value` varchar(255) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Triggers/udløsere `tag`
--
DELIMITER $$
CREATE TRIGGER `tag_rev__ai` AFTER INSERT ON `tag`
 FOR EACH ROW INSERT INTO mexplorer.tag_rev SELECT NULL, 'insert', 0, 'username', '127.0.0.1', 'ipv6', 0, NOW(), d.* 
    FROM mexplorer.tag AS d WHERE d.image = NEW.image AND d.keytext = NEW.keytext
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tag_rev__au` AFTER UPDATE ON `tag`
 FOR EACH ROW INSERT INTO mexplorer.tag_rev SELECT NULL, 'update', 0, 'username', '127.0.0.1', 'ipv6', 0, NOW(), d.* 
    FROM mexplorer.tag AS d WHERE d.image = NEW.image AND d.keytext = NEW.keytext
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `tag_rev__bd` BEFORE DELETE ON `tag`
 FOR EACH ROW INSERT INTO mexplorer.tag_rev SELECT NULL, 'delete', 0, 'username', '127.0.0.1', 'ipv6', 0, NOW(), d.* 
    FROM mexplorer.tag AS d WHERE d.image = OLD.image AND d.keytext = OLD.keytext
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur-dump for tabellen `tag_rev`
--

CREATE TABLE IF NOT EXISTS `tag_rev` (
  `id` int(11) NOT NULL,
  `action` varchar(6) COLLATE utf8_bin NOT NULL,
  `user` int(11) DEFAULT NULL,
  `username` varchar(255) COLLATE utf8_bin NOT NULL,
  `ipv4address` varchar(15) COLLATE utf8_bin DEFAULT NULL,
  `ipv6address` varchar(45) COLLATE utf8_bin DEFAULT NULL,
  `port` smallint(5) unsigned NOT NULL,
  `changedate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mapillary_key` char(32) COLLATE utf8_bin NOT NULL,
  `image` int(11) DEFAULT NULL,
  `keytext` varchar(64) COLLATE utf8_bin NOT NULL,
  `value` varchar(255) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Struktur-dump for tabellen `user`
--

CREATE TABLE IF NOT EXISTS `user` (
  `uuid` char(40) COLLATE utf8_bin NOT NULL,
  `user` varchar(255) COLLATE utf8_bin NOT NULL,
  `avatar` varchar(255) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Begrænsninger for dumpede tabeller
--

--
-- Indeks for tabel `image`
--
ALTER TABLE `image`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mapillary_key` (`mapillary_key`),
  ADD KEY `mapillary_key_2` (`mapillary_key`),
  ADD KEY `captured_at` (`captured_at`);

--
-- Indeks for tabel `tag`
--
ALTER TABLE `tag`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `image_2` (`image`,`keytext`),
  ADD KEY `image` (`image`);

--
-- Indeks for tabel `tag_rev`
--
ALTER TABLE `tag_rev`
  ADD PRIMARY KEY (`id`);

--
-- Indeks for tabel `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`uuid`),
  ADD KEY `user_index` (`user`);

--
-- Brug ikke AUTO_INCREMENT for slettede tabeller
--

--
-- Tilføj AUTO_INCREMENT i tabel `image`
--
ALTER TABLE `image`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- Tilføj AUTO_INCREMENT i tabel `tag`
--
ALTER TABLE `tag`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- Tilføj AUTO_INCREMENT i tabel `tag_rev`
--
ALTER TABLE `tag_rev`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- Begrænsninger for dumpede tabeller
--

--
-- Begrænsninger for tabel `tag`
--
ALTER TABLE `tag`
  ADD CONSTRAINT `TAG_IMAGE` FOREIGN KEY (`image`) REFERENCES `image` (`id`) ON DELETE NO ACTION;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
