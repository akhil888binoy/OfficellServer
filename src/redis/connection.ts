import { createClient } from 'redis';
import {client} from "../index";


export const redisConnection = async ()=>{
    if (!client.isOpen) {
        await client.connect();
    }
    return client
}

