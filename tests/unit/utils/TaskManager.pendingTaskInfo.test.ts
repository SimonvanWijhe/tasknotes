import type { App } from "obsidian";
import { App as MockApp, MockObsidian } from "../../helpers/obsidian-runtime";
import { FieldMapper } from "../../../src/services/FieldMapper";
import { DEFAULT_FIELD_MAPPING, DEFAULT_SETTINGS } from "../../../src/settings/defaults";
import type { TaskInfo } from "../../../src/types";
import { TaskManager } from "../../../src/utils/TaskManager";

const path = "Assignments/test.md";

const frontmatter = (status: string, dateModified: string) => ({
	title: "Test",
	status,
	priority: "normal",
	tags: ["task"],
	dateModified,
});

describe("TaskManager pending task info", () => {
	let app: App;
	let manager: TaskManager;

	beforeEach(() => {
		jest.useFakeTimers();
		MockObsidian.reset();
		app = new MockApp() as unknown as App;
		manager = new TaskManager(
			app,
			{
				...DEFAULT_SETTINGS,
				taskIdentificationMethod: "tag",
				taskTag: "task",
				excludedFolders: "",
				storeTitleInFilename: false,
			},
			new FieldMapper(DEFAULT_FIELD_MAPPING)
		);
		MockObsidian.createTestFile(path, "---\ntitle: Test\ntags:\n  - task\n---\n");
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("stops shadowing metadata when the written dateModified never matches the pending one", async () => {
		app.metadataCache.setCache(path, {
			frontmatter: frontmatter("ready-for-handoff", "2026-09-29T16:00:00.000+02:00"),
		});
		manager.updateTaskInfoInCache(path, {
			id: path,
			path,
			title: "Test",
			status: "ready-for-handoff",
			priority: "normal",
			archived: false,
			tags: ["task"],
			dateModified: "2026-09-29T16:00:00.004+02:00",
		} as TaskInfo);

		jest.advanceTimersByTime(60_000);
		app.metadataCache.setCache(path, {
			frontmatter: frontmatter("in-progress", "2026-09-29T16:00:00.000+02:00"),
		});

		await expect(manager.getTaskInfo(path)).resolves.toMatchObject({
			status: "in-progress",
		});
		expect(manager.getCachedTaskInfoSync(path)).toMatchObject({ status: "in-progress" });
	});
});
