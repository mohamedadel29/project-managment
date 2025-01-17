const factory = require("./HandlerFactory.js");
const Project_warehouse = require("../models/projects_WarehouseModel.js");
const notification = require("../models/notification .js");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const { uploadSinglePDF } = require("../middleware/uploadpdfMiddleware.js");
const fs = require("fs");
const path = require("path");
const download = require("download");
// Upload single image
exports.uploadprojectpdf = uploadSinglePDF("pdf");

// Image processing
exports.processpdf = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `project-${uuidv4()}-${Date.now()}.pdf`;

    // Save the PDF file into the desired directory
    req.body.pdf = filename; // Save the filename to the request body if needed

    // Construct the destination directory path
    const destinationDir = path.join(__dirname, "../uploads/project");

    // Ensure the directory exists, if not, create it
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // Construct the destination file path
    const destination = path.join(destinationDir, filename);

    // Write the uploaded file to the destination
    fs.writeFile(destination, req.file.buffer, (err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  } else {
    return next(new Error("No file uploaded"));
  }
});
exports.getallProject_warehouse = factory.getAll(Project_warehouse);

exports.getProject_warehouse = factory.getOne(Project_warehouse);

exports.createProject_warehouse =  asyncHandler(async (req, res) => {
  const project = await Project_warehouse.create(req.body);
  notification.create({
    student: project.user,
    project: project._id,
    content: "You have new the project pending",
  });
  res.status(201).json({ data: project });
});

exports.updateProject_warehouse = factory.updateOne(Project_warehouse);

exports.deleteProject_warehouse = factory.deleteOne(Project_warehouse);

exports.downloadpdf = async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const fileURL = `http://${req.headers.host}/project/${filename}`;
    console.log(fileURL);
    console.log(req.headers.host);

    // Download the file asynchronously
    await download(fileURL, "dist", { extract: { toplevel: true } });

    // Send a response indicating successful download
    res.status(200).send("File downloaded successfully");
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.acceptProject = async (req, res) => {
  const projectId = req.params.projectid;

  try {
    const project = await Project_warehouse.findByIdAndUpdate(
      projectId,
      { status: "accepted" },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    console.log(project);
    notification.create({
      student: project.user,
      project: project._id,
      content: "You have accepted the project",
    });
    return res.status(200).json({ msg: "Project accepted", data: project });
  } catch (error) {
    console.error("Error accepting project:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

exports.rejectproject = async (req, res) => {
  let projectId = req.params.projectid; // Correctly accessing projectId from req.params
  console.log(projectId);

  try {
    const deletedProject = await Project_warehouse.findByIdAndDelete(projectId);

    if (!deletedProject) {
      return res.status(404).json({ msg: "Project not found" });
    }
    notification.create({
      student: project.user,
      project: project._id,
      content: "You have rejected the project",
    });
    return res
      .status(200)
      .json({ msg: "Project deleted", data: deletedProject });
  } catch (error) {
    console.error("Error rejecting project:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

exports.like= async (req, res) => {
  try {
    const projectId = req.body.projectId;
    const userId = req.body.id;
    const projectObj = await Project_warehouse.findById(projectId);
    if (!projectObj) {
      return res.status(404).json({ error: "project not found" });
    }
    const alreadyLiked = projectObj.likes.some((like) => like.user === userId);
    if (alreadyLiked) {
      return res.status(400).json({
        error: "You have already liked this project",
      });
    }
    projectObj.likes.push({ user: userId });
    projectObj.numberOfLikes++;

    await projectObj.save();
    res
      .status(200)
      .json({ message: "project is liked successfully", projectObj });
  } catch (error) {
    console.error("Error liking project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/////////////////////////////////////
 exports.comment=async (req, res) => {
  try {
    const projectId = req.body.projectId;
    const userId = req.body.id;
    const {content}  = req.body;
    console.log(userId);

    const projectObj = await Project_warehouse.findById(projectId);
    if (!projectObj) {
      return res.status(404).json({ error: "Project not found" });
    }
    projectObj.comments.push({ user: userId, content });
    await projectObj.save();

    res.status(200).json({ message: "Comment added successfully", projectObj });
  } catch (error) {
    console.error("Error adding comment to project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
////////////////////////////////////////
exports.showlikes= async (req, res) => {
  try {
    const projectId = req.params._id;
    const projectObj = await Project_warehouse.findById(projectId);

    if (!projectObj) {
      return res.status(404).json({ error: "Project not found" });
    }

    res
      .status(200)
      .json({ likes:  projectObj.likes });
    
  } catch (error) {
    console.error("Error show all likes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

 exports.showcomment=async (req, res) => {
  try {
    const projectId = req.params._id;
    const projectObj = await Project_warehouse.findById(projectId);

    if (!projectObj) {
      return res.status(404).json({ error: "Project not found" });
    }

    res
      .status(200)
      .json({ likes:  projectObj.comments });
    
  } catch (error) {
    console.error("Error show all likes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deletecomment=async (req, res) => {
  try {
    const projectId = req.body.projectId;
    const userId = req.body.id;
    console.log(userId);

    const projectObj = await Project_warehouse.findById(projectId);
    if (!projectObj) {
      return res.status(404).json({ error: "Project not found" });
    }
    projectObj.comments.pull({ user: userId });
    await projectObj.save();

    res.status(200).json({ message: "Comment deleted successfully", projectObj });
  } catch (error) {
    console.error("Error adding comment to project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



//add review function here
// exports.review=(req,res)=>{
//   let data=req.body;
//   let pid=data.pid;
//   let uid=req.user._id;
//   Review.create(data,(err,doc)=>{
//     if(err) throw err;
//     Project_warehouse.findByIdAndUpdate(pid,{$push:{reviews:doc._id}})
//     .then(()=>{
//       User.findByIdAndUpdate(uid,{$push:{reviewedpro:pid}},function(err,user){
//         if(err) throw err;
//         else res.json(user);
//       });
//     }).catch((e)=>{console.log(e)});
// }};
