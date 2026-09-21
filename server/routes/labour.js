import { createCrudRouter } from "./crud.js";
import { toNum } from "./helpers.js";

export const labourRouter = createCrudRouter({
  table: "labour",
  columns: ["date", "name", "work_type", "workers", "amount"],
  orderBy: "date DESC, created_at DESC",
  mapIn: (body) => ({ ...body, work_type: body.workType }),
  mapOut: (row) => {
    const r = toNum(row, ["workers", "amount"]);
    return { id: r.id, date: r.date, name: r.name, workType: r.work_type, workers: r.workers, amount: r.amount };
  },
});
