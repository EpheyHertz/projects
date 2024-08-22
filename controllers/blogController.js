const { BlogPost } = require('../models');
const { v4: uuidv4 } = require('uuid');
const ytdl = require('ytdl-core');
// const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();
const os=require('os')
const fs = require('fs-extra');

// import chai from 'chai';
// const { assert } = chai;


const CloudConvert = require('cloudconvert');

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { from } = require('form-data');
const youtubedl = require('youtube-dl-exec');


// Configure multer for file uploads
const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath);
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    })
});

// Assembly AI API configuration
const AAI_API_KEY = process.env.AAI_API_KEY;
const ASSEMBLY_AI_BASE_URL = 'https://api.assemblyai.com/v2';

// Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://api.gemini.ai/v1beta';

// CloudConvert API configuration
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_BASE_URL = 'https://api.cloudconvert.com/v2';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // milliseconds
const MAX_PARALLEL_JOBS = 3;

// Configure Assembly AI client
 const configureAssemblyAI = () => {
    const apiClient = axios.create({
        baseURL: ASSEMBLY_AI_BASE_URL,
        headers: {
            'Authorization': `Bearer ${AAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    return {
        transcribeAudio: async (audioFilePath) => {
            try {
                const baseURL=ASSEMBLY_AI_BASE_URL
                const headers={
                    authorization: AAI_API_KEY
                }
                const audioData = await fs.readFile(audioFilePath)
                const uploadResponse = await apiClient.post(`${baseURL}/upload`, audioData,{
                    headers
                });
                const uploadUrl = uploadResponse.data.upload_url;
                console.log(uploadUrl)
                const data ={
                    audio_url:uploadUrl
                }
                const url = `${baseURL}/transcript`
                const response = await apiClient.post(url, data, { headers: headers })
                const transcriptId = response.data.id;
                

                let status = 'queued';
let transcriptResult;

while (status === 'queued' || status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    const statusResponse = await apiClient.get(`/transcript/${transcriptId}`);
    status = statusResponse.data.status;

    if (status === 'completed') {
        transcriptResult = statusResponse.data;
    }
}

if (status === 'completed') {
    console.log(transcriptResult.text);
    return transcriptResult.text;
} else {
    throw new Error('Transcription failed');
}

            } catch (error) {
                console.error('Error transcribing audio:', error.message);
                throw error;
            }
        }
    };
};

// Configure Gemini AI client
 // Import should match your module setup

 const genAI = new GoogleGenerativeAI(
     process.env.GEMINI_API,
);


const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generateContent = async (prompt, config) => {
    try {
        const response = await model.generateContent(prompt, config);
        return response;
    } catch (error) {
        console.error('Error making API request to Gemini AI:', error.message);
        throw error;
    }
};


// Configure CloudConvert client

 // 5 seconds delay for retrying

 const configureCloudConvert = () => {
    const apiClient = new CloudConvert(CLOUDCONVERT_API_KEY);

    const waitForJobCompletion = async (jobId) => {
        let jobStatus = 'queued';
        while (jobStatus === 'queued' || jobStatus === 'processing') {
            try {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                const statusResponse = await apiClient.jobs.get(jobId);
                jobStatus = statusResponse.data.status;
                console.log(`Job status: ${jobStatus}`);
            } catch (error) {
                console.error('Error checking job status:', error.message);
                if (error.response && error.response.data) {
                    console.error('API Error Response:', error.response.data);
                }
                throw error;
            }
        }
        return jobStatus === 'finished';
    };

    const downloadFile = async (fileUrl, outputPath) => {
        const writeStream = fs.createWriteStream(outputPath);
        const protocol = fileUrl.startsWith('https') ? https : http;
    
        return new Promise((resolve, reject) => {
            protocol.get(fileUrl, response => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download file. Status code: ${response.statusCode}`));
                    return;
                }
                response.pipe(writeStream);
                writeStream.on('finish', () => {
                    writeStream.close(resolve);
                });
                writeStream.on('error', reject);
            }).on('error', reject);
        });
    };

    return {
        convertVideoToAudio: async (videoFilePath, outputFilePath) => {
            let jobResponse;
            console.log(videoFilePath)
            console.log(outputFilePath)
            try {
                // Create a new job for the video to audio conversion
                jobResponse = await apiClient.jobs.create({
                    "tasks": {
                        "import-1": {
                            "operation": "import/upload"
                        },
                        "convert": {
                            "operation": "convert",
                            "input_format": "mp4"||"mov",
                            "output_format": "mp3",
                            "engine": "ffmpeg",
                            "input": ["import-1"],
                            "audio_codec": "mp3",
                            "audio_qscale": 0
                        },
                        "export-1": {
                            "operation": "export/url",
                            "input": ["convert"],
                            "inline": false,
                            "archive_multiple_files": false
                        }
                    },
                    "tag": "jobbuilder"
                });
                const uploadTask = jobResponse.tasks.filter(
                    task => task.name === 'import-1'
                )[0];
                const stream = fs.createReadStream(
                    videoFilePath
                );
                await apiClient.tasks.upload(uploadTask, stream);
                jobResponse = await apiClient.jobs.wait(jobResponse.id);
                // assert.equal(job.status, 'finished');
                const file = apiClient.jobs.getExportUrls(jobResponse)[0];
                // assert.equal(file.filename, outputFilePath);
                const writer = fs.createWriteStream(outputFilePath);
                const response = await axios(file.url, {
                    responseType: 'stream'
                });
                let fileUrl=file.url
                console.log(fileUrl)
                await downloadFile(fileUrl, outputFilePath);
                console.log(`File converted and saved to ${outputFilePath}`);

                // response.data.pipe(writer);
                // await new Promise((resolve, reject) => {
                //     writer.on('finish', resolve);
                //     writer.on('error', reject);
                // });
                const stat = fs.statSync(outputFilePath);
                console.log(stat.size)
    

                
            } catch (error) {
                console.error('Error converting video to audio:', error.message);
                if (error.response && error.response.data) {
                    console.error('API Error Response:', error.response.data);
                }
                throw error;
            };
            
        
        }
    };
};


// Function to fetch YouTube title
async function getYouTubeTitle(link) {
    try {
        const info = await ytdl.getInfo(link);
        return info.videoDetails.title;
        
    } catch (error) {
        console.error('Error fetching YouTube title:', error);
        throw new Error('Could not fetch YouTube title');
    }
}

// Function to download YouTube video audio
async function downloadYouTubeAudio(link, outputPath) {
    return new Promise((resolve, reject) => {
        youtubedl(link, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: outputPath
        }).then(output => {
            console.log('Downloaded to:', outputPath);
            resolve(outputPath);
        }).catch(reject);
    });
}

// async function downloadYouTubeAudio(link, outputPath, retries = 3) {
//     return new Promise((resolve, reject) => {
//         const attemptDownload = (remainingRetries) => {
//             const stream = ytdl(link, { filter: 'audioonly' });

//             stream.on('response', (response) => {
//                 console.log('YouTube stream started with status code:', response.statusCode);
//                 if (response.statusCode === 403 && remainingRetries > 0) {
//                     console.log(`Retrying download... ${remainingRetries} attempts left.`);
//                     setTimeout(() => attemptDownload(remainingRetries - 1), 3000);
//                     return;
//                 }
//                 if (response.statusCode === 403 && remainingRetries === 0) {
//                     return reject(new Error('Max retries reached. Status code: 403'));
//                 }
//             });

//             stream.pipe(fs.createWriteStream(outputPath))
//                 .on('finish', () => {
//                     console.log(`Audio file saved to ${outputPath}`);
//                     resolve(outputPath);
//                 })
//                 .on('error', (err) => {
//                     console.error('Error writing file:', err);
//                     reject(err);
//                 });

//             stream.on('error', (err) => {
//                 console.error('Error during download:', err);
//                 reject(err);
//             });
//         };

//         attemptDownload(retries);
//     });
// }

// Function to transcribe an uploaded file
async function transcribeFile(filePath) {
    console.log(filePath,'from transcribefile function')
    const assemblyAI = configureAssemblyAI();
    
    let transcripted=assemblyAI.transcribeAudio(filePath);
    console.log(transcripted,filePath)
    return assemblyAI.transcribeAudio(filePath);
}

// Function to generate blog content
async function generateBlogContent(transcription) {
    console.log(`Reached Gemini AI with transcription:`);
    
    const transcriptionText = `
    Create a blog article from the provided transcript:

    ${transcription}
    Structure the article as follows:
    1. Introduction: Briefly introduce the main topic or theme of the discussion.
    2. Body: Summarize the content based on timestamps.
    3. Conclusion: Summarize the key takeaways from the discussion.
    Format: Use clear headings and subheadings for different timestamps. 
    Write in an engaging and professional tone.
    `;

    const generationConfig = {
        candidate_count: 1,
        stop_sequences: ["in Conclusion", "\n\n\n\n\n"],
        max_output_tokens: 1000,
        temperature: 0.5,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await generateContent(transcriptionText, generationConfig);
            const content = result.response.text();

            if (content) {
                return content;
            } else {
                throw new Error('Unexpected response format');
            }
        } catch (error) {
            console.error(`Error during generation attempt ${attempt + 1}: ${error.message}`);
            if (attempt === MAX_RETRIES - 1) throw new Error('Failed to generate content after multiple attempts');
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }

    return "Content could not be generated due to repeated failures. Please try again later.";
}



// Controller function to handle blog generation
exports.generateBlog = [
    upload.single('file'), // Use multer middleware for file uploads
    async (req, res) => {
        try {
            const { youtube_link } = req.body;
            const file = req.file;
            const user = req.user;
              // Assuming the user is authenticated
              const sanitizeFilename = (filename) => {
                return filename.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '').replace(/[\s]/g, '_');
            };
            


            let title, transcript, generated_content,filename;
        if(youtube_link){
            try {
                // Get the YouTube video title
                title = await getYouTubeTitle(youtube_link);
                console.log('YouTube Video Title:', title);
                title = sanitizeFilename(title);
        
                // Generate the path to save the downloaded audio file
                const audioPath = path.join(__dirname, `../uploads/${title.replace(/[\/\\:]/g, "_")}.webm`);
                console.log('Audio Path:', audioPath);
        
                // Download the audio from the YouTube link and save it to the specified path
                await downloadYouTubeAudio(youtube_link, audioPath);
                console.log('Audio downloaded successfully');
        
                // Transcribe the downloaded audio file
                transcript = await transcribeFile(audioPath);
                console.log('Transcript:', transcript);
        
                // Generate blog content based on the transcription
                generated_content = await generateBlogContent(transcript);
                console.log('Generated Content:', generated_content);
        
            } catch (error) {
                console.error('Error processing YouTube link:', error.message);
                return res.status(500).json({ error: 'Failed to process YouTube link' });
            }
            
            } else if (file) {
                title = file.originalname;
                const filePath = file.path;
                
                if (path.extname(filePath) === '.mp4' || path.extname(filePath) === '.mov') {
                    // Convert video to audio using CloudConvert
                    console.log(filePath)
                    const cloudConvert = configureCloudConvert();
                    const audioPath = path.join(__dirname, `../uploads/${path.parse(title).name}.mp3`);
                    console.log(audioPath)
                    
                    // Use the CloudConvert function to convert and save the file
                    await cloudConvert.convertVideoToAudio(filePath, audioPath);
                    
                    console.log(`Audio file saved at ${audioPath}`);
            
                    transcript = await transcribeFile(audioPath);
                } else {
                    transcript = await transcribeFile(filePath);
                }
                generated_content = await generateBlogContent(transcript);
            } else {
                return res.status(400).json({ error: 'You must provide a YouTube link or upload a file' });
            }
            
            const newBlogPost = await BlogPost.create({
                id: uuidv4(),
                user_id: user.id,
                youtube_title: title,
                youtube_link: youtube_link || filePath,
                transcript,
                generated_content
            });

            res.json({ content: newBlogPost.generated_content,userId:newBlogPost.user_id,youtube_link:newBlogPost.youtube_link,youtube_title:newBlogPost.youtube_title,transcript:newBlogPost.transcript });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'An error occurred while generating the blog content' });
        }
    }
];

// Controller functions to handle fetching, getting, and deleting blogs (unchanged)
// blogController.js
exports.getBlogs = async (req, res) => {
    const userId = req.user?.id;

    console.log('User ID:', userId); // Ensure userId is logged correctly

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Fetch all blogs for the user
        const blogs = await BlogPost.findAll({ where: { user_id: userId } });

        // Check if any blogs were found
        if (blogs.length === 0) {
            return res.status(404).json({ error: 'No blogs found for this user' });
        }

        // Respond with the list of blogs
        res.json(blogs);
    } catch (error) {
        console.error('Error fetching blogs for user:', error); // Added logging for debugging
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
    res.send
};


exports.getBlogById = async (req, res) => {
    const blogId = req.blog?.id;
    try {
        const blog = await BlogPost.findOne({ where: { id: blogId } });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

exports.deleteBlog = async (req, res) => {
    const blogId = req.blog?.id;
    try {
        const blog = await BlogPost.destroy({ where: { id: blogId } });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};
