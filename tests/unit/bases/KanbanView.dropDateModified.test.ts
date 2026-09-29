import { TFile } from "obsidian";
import { KanbanView } from "../../../src/bases/KanbanView";
import type { TaskInfo } from "../../../src/types";
import { getCurrentTimestamp } from "../../../src/utils/dateUtils";

jest.mock("../../../src/utils/dateUtils", () => ({
	...jest.requireActual("../../../src/utils/dateUtils"),
	getCurrentTimestamp: jest.fn(),
}));

describe("KanbanView status drop", () => {
	it("caches the same dateModified it writes to the frontmatter", async () => {
		let tick = 0;
		(getCurrentTimestamp as jest.Mock).mockImplementation(
			() => `2026-09-29T16:00:00.00${tick++}+02:00`
		);

		const path = "Assignments/test.md";
		const task = {
			title: "Test",
			status: "open",
			priority: "normal",
			path,
			archived: false,
		} as TaskInfo;
		const frontmatter: Record<string, unknown> = { status: "open" };
		const applyPropertyChangeSideEffects = jest.fn();

		const view = new KanbanView(
			{},
			document.createElement("div"),
			{
				app: {
					vault: { getAbstractFileByPath: () => new TFile(path) },
					fileManager: {
						processFrontMatter: async (
							_file: TFile,
							update: (fm: Record<string, unknown>) => void
						) => update(frontmatter),
					},
				},
				fieldMapper: {
					toUserField: (field: string) => field,
					lookupMappingKey: (field: string) => field,
					isRecognizedProperty: () => true,
				},
				priorityManager: { getAllPriorities: () => [] },
				statusManager: { isCompletedStatus: () => false },
				taskService: {
					updateCompletedDateInFrontmatter: jest.fn(),
					applyPropertyChangeSideEffects,
				},
				settings: { customStatuses: [], fieldMapping: { sortOrder: "sort_order" } },
			} as any
		);
		const internals = view as any;
		internals.getGroupByPropertyId = () => "note.status";
		internals.dataAdapter = { getSortConfig: () => null };
		internals.schedulePostDropRender = jest.fn();
		internals.draggedFromColumn = "open";
		internals.taskInfoCache.set(path, task);

		await internals.handleTaskDrop(path, "ready-for-handoff", null);

		expect(frontmatter.status).toBe("ready-for-handoff");
		const updatedTask = applyPropertyChangeSideEffects.mock.calls[0][2] as TaskInfo;
		expect(updatedTask.dateModified).toBe(frontmatter.dateModified);
	});
});
