CREATE TABLE `rag_demo_states` (
	`demoId` varchar(64) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rag_demo_states_demoId` PRIMARY KEY(`demoId`)
);
