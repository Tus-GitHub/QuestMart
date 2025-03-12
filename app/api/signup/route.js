import connectDB from "@/app/lib/mdConnection";
import User from "@/app/models/User";
import bcryptjs from 'bcryptjs';

export async function POST(req){
    await connectDB();
    try{
        const {username,email, password} = await req.json();
        if(!username || !email || !password){
            return Response.json({message:"Fill every detail"}, {status:400});
        }
        const hashedPassword = bcryptjs.hashSync(password, 10);
        const newUser = new User({username, email, password:hashedPassword});
        try{
            await newUser.save();
            return Response.json({message:"User signuped succesfully"}, {status:201});
        } catch(error){
            return Response.json({message:"Error while saving user", error:error.message}, {status:500});
        }
    } catch(error){
        return Response.json({message:"Server error", error:error.message}, {status:500});
    }
}