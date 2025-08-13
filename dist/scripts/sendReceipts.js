import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function sendReceiptsToEndpoint({ endpoint, dryRun, delayMs, csvPath }) {
    const resolvedCsvPath = csvPath;
    const receipts = [];
    // Check if CSV file exists
    if (!fs.existsSync(resolvedCsvPath)) {
        throw new Error(`CSV file not found: ${resolvedCsvPath}`);
    }
    console.log(`Reading receipts from: ${resolvedCsvPath}`);
    console.log(`Sending to endpoint: ${endpoint}`);
    console.log(`Delay between requests: ${delayMs}ms`);
    console.log(`Dry run mode: ${dryRun}`);
    return new Promise((resolve, reject) => {
        fs.createReadStream(resolvedCsvPath)
            .pipe(csv())
            .on('data', (data) => {
            receipts.push(data);
        })
            .on('end', async () => {
            console.log(`Found ${receipts.length} receipt records`);
            try {
                let successCount = 0;
                let errorCount = 0;
                for (let i = 0; i < receipts.length; i++) {
                    const record = receipts[i];
                    // Parse product_category if it's a JSON array
                    let parsedCategory;
                    try {
                        parsedCategory = record.PRODUCT_CATEGORY ? JSON.parse(record.PRODUCT_CATEGORY) : null;
                    }
                    catch (error) {
                        // If parsing fails, use the raw string
                        parsedCategory = record.PRODUCT_CATEGORY;
                    }
                    const receiptPayload = {
                        receipt_id: record.RECEIPT_ID,
                        product_id: record.PRODUCT_ID,
                        receipt_created_timestamp: record.RECEIPT_CREATED_TIMESTAMP,
                        merchant_name: record.MERCHANT_NAME,
                        product_description: record.PRODUCT_DESCRIPTION,
                        brand: record.BRAND,
                        product_category: parsedCategory,
                        total_price_paid: record.TOTAL_PRICE_PAID,
                        product_code: record.PRODUCT_CODE,
                        product_image_url: record.PRODUCT_IMAGE_URL,
                    };
                    console.log(`[${i + 1}/${receipts.length}] Sending record ${record.RECEIPT_ID}:${record.PRODUCT_ID}`);
                    if (dryRun) {
                        console.log(JSON.stringify(receiptPayload, null, 2));
                        console.log('---');
                        successCount++;
                    }
                    else {
                        try {
                            const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(receiptPayload),
                            });
                            if (response.ok) {
                                console.log(`Success: ${response.status}`);
                                successCount++;
                            }
                            else {
                                console.log(`Failed: ${response.status} ${response.statusText}`);
                                const errorText = await response.text();
                                console.log(`Error response: ${errorText}`);
                                errorCount++;
                            }
                        }
                        catch (error) {
                            console.log(`Request failed: ${error}`);
                            errorCount++;
                        }
                    }
                    // Add delay between requests (except for the last one)
                    if (i < receipts.length - 1 && delayMs > 0) {
                        await setTimeout(delayMs);
                    }
                }
                console.log(`\nSummary:`);
                console.log(`Successful: ${successCount}`);
                console.log(`Failed: ${errorCount}`);
                console.log(`Total: ${receipts.length}`);
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // Configure yargs
    const argv = yargs(hideBin(process.argv))
        .options({
        endpoint: {
            alias: 'e',
            describe: 'API endpoint URL',
            type: 'string',
            default: 'http://localhost:7646/receipt',
        },
        delayMs: {
            alias: 'd',
            describe: 'Delay between requests in milliseconds',
            type: 'number',
            default: 100,
        },
        dryRun: {
            alias: 'n',
            describe: 'Preview payloads without sending requests',
            type: 'boolean',
            default: false,
        },
        csvPath: {
            alias: 'f',
            describe: 'Path to CSV file containing receipt data',
            type: 'string',
            default: path.join(__dirname, '..', '..', 'data', 'receipt_data_take_home_example.csv'),
        },
    })
        .example('$0 --dryRun', 'Preview payloads without sending requests')
        .example('$0 --endpoint http://localhost:7646/receipt --delayMs 500', 'Send to custom endpoint with 500ms delay')
        .example('$0 --csvPath ./my-receipts.csv --dryRun', 'Preview payloads from custom CSV file')
        .example('$0 -f ./data/receipts.csv -e http://localhost:7646/receipt -d 200', 'Send custom CSV to endpoint with 200ms delay')
        .help()
        .alias('help', 'h')
        .parseSync();
    sendReceiptsToEndpoint(argv)
        .then(() => process.exit(0))
        .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
