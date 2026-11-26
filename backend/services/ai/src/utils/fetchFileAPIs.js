import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const File_url = process.env.FILE_SERVICE_URL || "http://localhost:8003";

export const createFolder = async ({projectId, parentId, name, userId}) => {
    try {
        const {data} = await axios.post(`${File_url}/create-folder`, {
            projectId,
            parentId,
            name,
        }, {Headers: {"x-user-id": String(userId)}});

        return data;
    } catch (error) {
        console.error("Error creating folder:", error.message);
    }
}

export const createFile = async ({projectId, parentId, name, content="", language="plaintext", userId}) => {
    try {
        const {data} = await axios.post(`${File_url}/create-file`, {
            projectId,
            parentId,
            name,
            content,
            language
        }, {Headers: {"x-user-id": String(userId)}});

        return data;
    } catch (error) {
        console.error("Error creating file:", error.message);
    }
}

export const updateFile = async ({name, content="", userId, id}) => {
    try {
        const {data} = await axios.put(`${File_url}/update:${id}`, {
            name,
            content
        }, {Headers: {"x-user-id": String(userId)}});

        return data;
    } catch (error) {
        console.error("Error updating file:", error.message);
    }
}

export const deleteFile = async ({userId, id}) => {
    try {
        const {data} = await axios.delete(`${File_url}/${id}`, {
            headers: {"x-user-id": String(userId)}
        });

        return data;
    } catch (error) {
        console.error("Error deleting file:", error.message);
    }
}

export const getTree = async ({userId, projectId}) => {
    try {
        const {data} = await axios.get(`${File_url}/tree/${projectId}`, {
            headers: {"x-user-id": String(userId)}
        });

        return data;
    } catch (error) {
        console.error("Error fetching file tree:", error.message);
    }
}

export const getFile = async ({userId, id}) => {
    try {
        const {data} = await axios.get(`${File_url}/${id}`, {
            headers: {"x-user-id": String(userId)}
        });

        return data;
    } catch (error) {
        console.error("Error deleting file:", error.message);
    }
}
