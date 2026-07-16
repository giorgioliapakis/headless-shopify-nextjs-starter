#!/usr/bin/env node
import { inspectStorefrontConnection } from "./doctor-lib.mjs";

const report = await inspectStorefrontConnection(process.env);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
