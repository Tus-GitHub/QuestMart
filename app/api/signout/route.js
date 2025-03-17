import { cookies } from "next/headers";


export async function GET(){
    try{
        const cookieStore = await cookies();
        cookieStore.set('accessToken', '',{
            maxAge:0,
            path:'/',
            httpOnly:true,
        });
        return Response.json({success:true, message:"Signed-Out Successfully"}, {status:200});
    }catch(error){
        return Response.json({success:false, message:"Server error", error:error.message}, {status:500});
    }
}