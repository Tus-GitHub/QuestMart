import { cookies } from "next/headers";


export async function GET(){
    try{
        cookies().set('accessToken', '', {maxAge:0, path:'/'});
        return Response.json({success:true, message:"SignedOut Successfully"}, {status:200});
    }catch(error){
        return Response.json({success:false, message:"Server error", error:error.message}, {status:500});
    }
}