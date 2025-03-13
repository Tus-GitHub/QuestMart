import connectDB from "@/lib/mdConnection";
import User from "@/app/models/User";
import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req){
    await connectDB();
    try{
        const body = await req.json();
        const {identifier, password} = body;
        if(!identifier || !password){
            return Response.json(
                {success:false, message:"Fill every detail"},
                {status:400},
            );
        }
        const isEmail = /\S+@\S+\.\S+/.test(identifier);
        const query = isEmail ? {email:identifier} : {username:identifier};

        const existingUser = await User.findOne(query);

        if(!existingUser){
            return Response.json(
                {success:false, message:"User not found"}
            )
        }
        const validPassword = bcryptjs.compareSync(password, existingUser.password);
        if(!validPassword){
            return Response.json(
                {success:false, message:"Wrong Password"},
                {status:401}
            )
        }

        const token = jwt.sign(
            {id:existingUser._id},
            JWT_SECRET,
            {expiresIn: '7d'}
        );

        const {password: _, ...userData} = existingUser._doc;

        const response = new Response(
            JSON.stringify({success:true, message:"Login successfull", user:userData}),
            {
                status:200,
                headers:{
                    "Content-Type" : "application/json",
                    "Set-Cookie": `accessToken=${token}: HttpOnly: Secure; Path=/`
                }
            }
        );

        return response;

    }catch(error){
        return Response.json(
            {success:false, message:"Server error", error:error.message},
            {status:500},
        )
    }
}