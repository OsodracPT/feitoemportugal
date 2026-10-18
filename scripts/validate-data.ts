#!/usr/bin/env node
/**
 * Validates everything under data/: brand schema, taxonomy schema and the
 * cross-file references between them. Used locally (`pnpm validate`) and by
 * the validate.yml workflow.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  DataError,
  loadBrands,
  loadDistrictShapes,
  loadTaxonomy,
  validateDataset,
  validateDistrictShapes,
  validateMedia,
  type Issue,
} from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(repoRoot, 'data');
const assetsDir = join(repoRoot, 'assets');

function report(issues: Issue[]): void {
  for (const issue of issues) {
    const where = issue.path ? `${issue.file} → ${issue.path}` : issue.file;
    const prefix = issue.level === 'error' ? 'ERROR' : 'warn ';
    console.log(`${prefix}  ${where}: ${issue.message}`);
  }
}

try {
  const taxonomy = loadTaxonomy(dataDir);
  const brands = loadBrands(dataDir);
  const issues = [
    ...validateDataset(brands, taxonomy),
    ...validateDistrictShapes(loadDistrictShapes(dataDir), taxonomy),
    ...validateMedia(brands, assetsDir),
  ];
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  report(warnings);
  report(errors);

  const published = brands.filter((b) => b.data.status === 'published').length;
  console.log(
    `\n${brands.length} brands (${published} published), ${taxonomy.categories.length} categories, ` +
      `${taxonomy.tags.length} tags, ${taxonomy.products.length} product types, ` +
      `${taxonomy.regions.length} regions, ` +
      `${taxonomy.regions.reduce((n, r) => n + r.municipalities.length, 0)} municipalities`,
  );
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exitCode = errors.length > 0 ? 1 : 0;
} catch (error) {
  if (error instanceof DataError) {
    console.error(`ERROR  ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
