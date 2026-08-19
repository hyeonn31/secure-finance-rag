CREATE TABLE `rag_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`ordinal` int NOT NULL,
	`content` text NOT NULL,
	`charStart` int NOT NULL,
	`charEnd` int NOT NULL,
	`embedding` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rag_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rag_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(32) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`status` enum('uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploaded',
	`extractedCharacters` int NOT NULL DEFAULT 0,
	`chunkCount` int NOT NULL DEFAULT 0,
	`parsingScore` int NOT NULL DEFAULT 0,
	`embeddingScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rag_documents_id` PRIMARY KEY(`id`)
);
