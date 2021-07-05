require("dotenv").config();
import fs from "fs";
import Papa from "papaparse";
import { log } from "./log";
import { newNode, insertInto, search, Node } from "./btree";
import { toFileName, isPluralized, TableFileName } from "./manipulation";

export type FileCache = Record<TableFileName, Node | any>;
export type Filter = Record<string, string>;
export type CSVObj = { meta: any; data: any[] };

// Just to keep people from doing large datasets
// and crashing things.
const MAX_RESULTS = 1000;
// Object to hold files once read from disk
export const FILE_CACHE: FileCache = {};
// If the table has an ID make a btree of the ids
// for a bit faster lookup
const ID_IDX_CACHE: FileCache = {};

// Read a "table" (aka csv file) from disk
export function readCachedTable(
  table: TableFileName,
  reload = false
): [CSVObj, Node] {
  if (FILE_CACHE[table] === undefined || reload === true) {
    const csv: CSVObj = Papa.parse(
      fs.readFileSync(`./repository/${process.env.REPO}/${table}.csv`, "utf8"),
      {
        quotes: false,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        skipEmptyLines: false,
        columns: null,
      }
    );
    FILE_CACHE[table] = csv;

    // If the fields have a dedicated ID use that to build
    // a btree index to try to make id lookups faster
    if (csv.meta.fields.indexOf("id") >= 0) {
      log("Building tree based on id...");
      // Try to make the root node somewhat unusual to
      // try to keep the tree at least somewhat balanced
      const pivot = csv.data.length >> 1;
      log("Tree pivot:", pivot);
      const troot = newNode(pivot + "");
      csv.data.forEach((v) => {
        insertInto(troot, newNode(v["id"], v));
      });
      ID_IDX_CACHE[table] = troot;
    }
  }

  return [FILE_CACHE[table], ID_IDX_CACHE[table]];
}

let SCHEMA_CONTENTS: string = undefined;
export function readSchema() {
  if (SCHEMA_CONTENTS !== undefined) {
    return SCHEMA_CONTENTS;
  }
  SCHEMA_CONTENTS = fs.readFileSync(
    `./repository/${process.env.REPO}/schema.graphql`,
    "utf8"
  );
  return SCHEMA_CONTENTS;
}

// Quick and dirty (and very non-performant) search
// but this is not a database ... or is it?
function filterRecords(table: TableFileName, filter: Filter): any[] {
  const [tbl, idx] = readCachedTable(table);
  const data = tbl.data;

  log("Filter:", filter);

  const records = [];
  const filterKeys = Object.keys(filter);
  const filterKeyLen = filterKeys.length;

  // no filter, just return everything
  // limited to max size. (could use this for
  // paging...)
  if (filterKeyLen === 0) {
    log(`${table}: No filter return table slice...`);
    const slice = data.slice(0, MAX_RESULTS);
    return slice;
  }

  // ID only search
  {
    const addIfArray = (v, r) => {
      if (Array.isArray(v)) r.push(...v);
      else r.push(v);
    };

    // We can only really do this if ID is the only thing they
    // are looking for, and this table has an indexed id
    if (filterKeyLen === 1 && filter.id !== undefined && idx) {
      log(`${table}: ID only search...`);
      // if a one-to-many, check each item to see
      // if it matches - this only applies to a filter
      // that is an array id: [1,2,3]
      if (Array.isArray(filter.id)) {
        filter.id.forEach((i) => {
          const found = search(idx, i);
          addIfArray(found, records);
        });
        return records;
      }

      const found = search(idx, filter.id);
      addIfArray(found, records);
      return records;
    }
  }

  log(`${table}: Full table scan...`, filter);
  {
    // Loop over all the data in memory and apply the
    // filters to each row. This is knowingly O(N^2).
    for (let r = 0; r < data.length; r++) {
      const record = data[r];

      let match = false;
      for (let i = 0; i < filterKeyLen; i++) {
        let key = filterKeys[i];

        if (record[key] === filter[key]) {
          // basic check of this one filter item
          match = true;
        } else {
          // doesn't match, no need to check
          // other filter params
          match = false;
          break;
        }
      }

      if (match) records.push(record);
      if (records.length >= MAX_RESULTS) break;
    }
  }

  return records;
}

// Scan a table using a set of filters. This is
// perfect match only
function scanTable(table: TableFileName, filter: Filter) {
  const records = filterRecords(toFileName(table), filter);

  // this is to make Bramble work.
  if (table === "Service") {
    const rec = records[0] || undefined;
    if (rec) {
      rec.schema = readSchema();
    }
    return rec;
  }

  if (filter.hasOwnProperty("id") && !Array.isArray(filter["id"])) {
    // An ID query should only return one record
    // just assume it's index zero or null.
    return records[0] || undefined;
  }

  return records;
}

export async function getValues(parent, ctx, sheet: string, args: any) {
  // if we have a parent, we might have a single or array
  // type query (one to one, one to many)...
  if (parent) {
    const id = parent[sheet.toLowerCase() + "_id"];
    // assume , list or one-to-many
    if (id && !isPluralized(sheet)) {
      args["id"] = id.split(",");
    } else if (id) {
      // or just ID
      args["id"] = id;
    }
  }

  // force table into non-plural
  return scanTable(sheet, args);
}
