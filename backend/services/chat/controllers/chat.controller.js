import Conversation
from "../models/conversation.model.js";
import Message
from "../models/message.model.js";

export const createConversation =async(req,res)=>{

  try{
    console.log("Reached createConversation");
    console.log("Authenticated user:", req.user);
    console.log("Request body:", req.body);

    const userId =req.headers["x-user-id"];
    console.log("userId",userId)

    console.log("Before Conversation.create()");
    const conversation =await Conversation.create({
     userId:userId
    });
    console.log("After Conversation.create()");

    console.log("Before response");
    res.json(
     conversation
    );

  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

}


export const getConversations =async(req,res)=>{

  try{
    const userId =req.headers["x-user-id"];
    const conversations =await Conversation.find({

     userId:userId

    })
    .sort({
     updatedAt:-1
    });

    res.json(
     conversations
    );

  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

}

export const saveMessage =async(req,res)=>{

  try{

    const {
     conversationId,
     role,
     content,
     images,
    artifacts
    } = req.body;

    const message =await Message.create({

     conversationId,

     role,
    images,
     content,
     artifacts:
    artifacts || []

    });

    res.json(
     message
    );

  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

}

export const getMessages =async(req,res)=>{

  try{

    const messages =await Message.find({

     conversationId:
     req.params.id

    })
    .sort({
     createdAt:1
    });

    res.json(
     messages
    );

  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

}

export const updateConversation=async (req,res)=>{
  try {
    const {conversationId,title}=req.body
    const conversation=await Conversation.findByIdAndUpdate( conversationId,{
        title
    })
    res.json(
      conversation
    );

  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }
}

export const deleteConversation=async (req,res)=>{
  try {
    const {conversationId}=req.body
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    res.json({
        success: true,
        message: "Conversation deleted successfully"
    });
  }catch(err){
    console.error("=== CHAT ERROR ===");
    console.error(err);
    console.error(err.stack);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }
}