import User from "../models/User.js";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserType } from "../models/User.js";
import { sendMail } from "../utils/SendMail.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedDomains = ["gmail.com", "yahoo.com", "hotmail.com", "ekaant.co"];

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, organization, phoneNo, userType } = req.body;
    console.log(req.body);
    if (
      !name ||
      !email ||
      !password ||
      !organization ||
      !phoneNo ||
      !userType
    ) {
      return res.status(400).json({ error: "Please enter all fields" });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    if (userType === UserType.Organization) {
      if (!organization) {
        return res.status(400).json({ error: "Please enter Organization" });
      }
      const emailDomain = email.split("@")[1];
      if (!allowedDomains.includes(emailDomain)) {
        return res
          .status(400)
          .json({ error: "Please enter your company email address" });
      }
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      organization,
      phoneNo,
      userType,
    });
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "30d",
      }
    );
    sendMail(token, email);

    return res.status(201).json({ user, token });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter all fields" });
    }

    const user = await User.findOne({ email }).lean(); // Find user by email
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.isEmailVerified) {
      return res.status(400).json({ error: "Please verify your email" });
    }
    // if (user.firstTime) {
    //   user.firstTime = false;
    //   await user.save();
    // }

    const isPsswordMatch = await bcrypt.compare(password, user.password);

    if (!isPsswordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "30d",
      }
    );
    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        phoneNo: user.phoneNo,
        isEmailVerified: user.isEmailVerified,
        hasPaid: user.hasPaid,
        userType: user.userType,
        firstTime: user.firstTime,
        freeTrailStartDate: user.freeTrailStartDate,
      },
      token,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "Invalid token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    const { _id } = decoded as { _id: string };
    await User.findByIdAndUpdate(_id, {
      isEmailVerified: true,
      freeTrailStartDate: new Date(),
    });

    res
      .status(200)
      .sendFile(path.join(__dirname, "../../public/verified.html"));
    // return res.status(200).json({ message: "Email verified" });
  } catch (error: any) {
    // if (error instanceof jwt.TokenExpiredError) {
    //   return res.status(401).json({ error: "Token expired" });
    // } else if (error instanceof jwt.JsonWebTokenError) {
    //   return res.status(401).json({ error: "Invalid token" });
    // } else {
    //   return res.status(500).json({ error: "Internal server error" }); // Handle unexpected errors
    // }
    console.log(error);
    res.status(500).sendFile(path.join(__dirname, "../../public/failed.html"));
  }
};
