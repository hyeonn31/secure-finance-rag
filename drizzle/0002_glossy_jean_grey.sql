ALTER TABLE `rag_documents` ADD `parsingDurationMs` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rag_documents` ADD `embeddingCoverage` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rag_documents` ADD `embeddingDurationMs` int DEFAULT 0 NOT NULL;