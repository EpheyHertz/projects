const axios = require('axios');
const cloudConvert = require('cloudconvert');
CLOUDCONVERT_API_KEY='eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYmY2MzNmNzdkNjVhNWQxYTIzOTY0NWYwZjQzNTMxYTZmMjJkMTg4OTVmZTZkNjNmNWRkNTU5ZjNhMWY2ZmI0ZWZkMDZkNzI0ZDk4YmI5NzUiLCJpYXQiOjE3MjQxNzI0MDQuMTM0ODMxLCJuYmYiOjE3MjQxNzI0MDQuMTM0ODMyLCJleHAiOjQ4Nzk4NDYwMDQuMTMxMDYsInN1YiI6IjY5MzM3MTI2Iiwic2NvcGVzIjpbInRhc2sucmVhZCIsInRhc2sud3JpdGUiLCJ3ZWJob29rLnJlYWQiLCJ3ZWJob29rLndyaXRlIiwicHJlc2V0LnJlYWQiLCJwcmVzZXQud3JpdGUiXX0.ruAoWKIJexEvUKshuGOGMv_N6I20DHhCNKsl-0pb85IsTYqU7z5yEx3L_mHTNteHUSzaaPonklnqUSkIKBSXbNNF5STwiALK7MQ_N3amVwTUdMCF8TObQEHnkj_8T2tazHbDQ2n4blwdg6WMzvdxiAIP2NVboQcEujVwT9LYo6w6cSoXbp325Nxv2UNnSxC4vPvJ2KehCsuPvzzn_QgBQbGheWDujeW9sSxiPr6DvnBcPLlRGb6JlwTSI1UZzCC34COnlkhuUQAy0dPITJgdiCH53GmfazJ3z33KH762KaaIdsPHegP3qDrJvRJONZFUIWwIn7RNlTuoqGTdYbtNddf9SO3H0YHRNHZPllSflq9rVhJFMrs28XuA64vOZSjiylqOPMMgghVnjWp1kEhfCTico_ppF8mjDv45tvxXM8zWrLqlTRi9RIS9mMFjm6WOxtuPxhJDmd0yOuk-s-RhaWWH6X53SCaSkz_9ICgKKcFaQJLEGowtNn8Q7WASU-2NRDfKhcUardS_fC6vwgpMJijdw0RcvELYE6iSK0-pGgaetgDTnVBwumkpeD2-5v1yW8Q-2dpb5yKQvNYS1iTjSEXb_D_qa22hGO44h4aNIWg8qksH7oQwx7m9uQs9_K_N4o_IBY2VDyFLflf5-0lP8dLvQRyfpSCUbtjkm8sivdE'

const cloudconvert = new cloudConvert(CLOUDCONVERT_API_KEY);

const fs=require('node:fs')
const http=require('http')

let job = cloudconvert.jobs.create({
    "tasks": {
        "import-1": {
            "operation": "import/upload"
        },
        "convert": {
            "operation": "convert",
            "input_format": "mp4",
            "output_format": "mp3",
            "engine": "ffmpeg",
            "input": [
                "import-1"
            ],
            "audio_codec": "mp3",
            "audio_qscale": 0
        },
        "export-1": {
            "operation": "export/url",
            "input": [
                "convert"
            ],
            "inline": false,
            "archive_multiple_files": false
        }
    },
    "tag": "jobbuilder"
});
console.log(job)
let response= job.data
console.log(response)
file = '/uploads'
const writeStream = fs.createWriteStream('./out/' + file.filename);

// http.get(file.url, function(response) {
//     response.pipe(writeStream);
// });

new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
});
// 
// 
if (!jobResponse || !jobResponse.data) {
    throw new Error('Failed to create job. No response from API.');
}
console.log('Job created:', jobResponse.data);

// Extract the task IDs
const importTask = jobResponse.data.tasks.find(task => task.name === 'import-1');
const exportTask = jobResponse.data.tasks.find(task => task.name === 'export-1');

if (!importTask || !importTask.id) {
    throw new Error('Import task ID not found.');
}

if (!exportTask || !exportTask.id) {
    throw new Error('Export task ID not found.');
}

// Upload the video file
console.log('Uploading video file...');
await apiClient.tasks.upload(importTask.id, fs.createReadStream(videoFilePath));
console.log('Video file uploaded successfully.');

// Wait for the job to complete
const isCompleted = await waitForJobCompletion(jobResponse.data.id);
if (!isCompleted) {
    throw new Error('Conversion failed or timed out.');
}

// Fetch the export task to get the file URL
console.log('Fetching export task details...');
const exportTaskResponse = await apiClient.tasks.get(exportTask.id);
if (!exportTaskResponse || !exportTaskResponse.data.result || !exportTaskResponse.data.result.files || !exportTaskResponse.data.result.files[0]) {
    throw new Error('Failed to retrieve the file URL from the export task.');
}
const fileUrl = exportTaskResponse.data.result.files[0].url;

// Download the converted file
console.log(`Downloading file from ${fileUrl}...`);
await downloadFile(fileUrl, outputFilePath);
console.log(`File converted and saved to ${outputFilePath}`);