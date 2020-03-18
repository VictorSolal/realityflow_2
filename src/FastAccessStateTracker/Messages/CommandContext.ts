/**
 * This file serves as the container for the different message types 
 * that can be received. Each class is its own message type, 
 * each of which has a single method allowing said command to 
 * be executed with the JSON data provided.
 */
import { StateTracker } from "../StateTracker";


import { FlowProject } from "../FlowLibrary/FlowProject";
import { FlowObject } from "../FlowLibrary/FlowObject";
import { FlowBehavior } from "../FlowLibrary/FlowBehavior";

import { MessageBuilder } from "./MessageBuilder";
import { TreeChildren } from "typeorm";

import { v4 as uuidv4 } from 'uuid';
import { ServerEventDispatcher } from "../../server";



interface ICommand
{
  ExecuteCommand(data: any, client: string) : Promise<[String, Array<String>]>;
}

// Project Commands

class Command_CreateProject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    data.Project.Id = uuidv4();

    let project : FlowProject = new FlowProject(data.Project);

    let returnData = await StateTracker.CreateProject(project, data.flowUser.Username, client);

    let message = returnData[0] == null ? "Failed to Create Project" : returnData[0];
      
    let returnContent = {
      "MessageType": "CreateProject",
      "WasSuccessful": returnData[0] == null ? false : true,
      "FlowProject": message
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])
    
    return returnMessage;
  }
}
/**
 * Read Project simply pulls in and returns Flow project data when given a project ID
 */
class Command_ReadProject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    let returnData = await StateTracker.ReadProject(data.FlowProject.Id, client);
    let message = returnData[0] == null ? "Failed to Read Project" : returnData[0];

    let returnContent = {
      "MessageType": "ReadProject",
      "WasSuccessful": returnData[0] == null ? false : true,
      "FlowProject": message
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;

  }
}

class Command_DeleteProject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {

    let returnData = await StateTracker.DeleteProject(data.FlowProject.Id, data.flowUser.Username, client);
    let returnContent = {
      "MessageType": "DeleteProject",
      "WasSuccessful": returnData[0],
    }
    
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}


class Command_OpenProject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    
    let returnData = await StateTracker.OpenProject(data.ProjectId, data.flowUser.Username, client);
    
    // notify others in the room that user has joined
    Command_OpenProject.SendRoomAnnouncement(returnData[2], "UserJoinedRoom");

    let message = returnData[0] == null ? "Failed to Open Project" : returnData[0];

    let returnContent = {
      "MessageType": "OpenProject",
      "WasSuccessful": returnData[0] == null ? false : true,
      "FlowProject": message
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }

  static async SendRoomAnnouncement(roomBulletin: [String, Array<String>], messageType : string): Promise<void>
  {

    if(roomBulletin)
    {
      let roomMessage = roomBulletin[0];
      let message = {
        "MessageType": messageType,
        "Message": roomMessage,
      }

      let roomClients : Array<String> = roomBulletin[1];
      
      for(let i = 0; i < roomClients.length; i++)
      {
        let clientSocket = ServerEventDispatcher.SocketConnections.get(roomClients[i]);
        ServerEventDispatcher.send(JSON.stringify(message), clientSocket);
      }
    }
    
  }
}


class Command_FetchProjects implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    
    let returnData = await StateTracker.FetchProjects(data.flowUser.Username, client);
    

    let message = returnData[0] == null ? "Failed to fetch projects" : returnData[0];

    let returnContent = {
      "MessageType": "FetchProjects",
      "WasSuccessful": returnData[0] == null ? false : true,
      "Projects": message
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}


class Command_LeaveProject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    
    let returnData = await StateTracker.LeaveProject(data.ProjectId, data.flowUser.Username, client);
    
    // notify others in the room that user has joined
    Command_OpenProject.SendRoomAnnouncement(returnData[2], "UserLeftRoom");

    let message = returnData[0] == false ? "Failed to Leave Project" : "Successfully Left Project";

    let returnContent = {
      "MessageType": "LeaveProject",
      "WasSuccessful": returnData[0],
      "FlowProject": message
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}


// // User Commands
//TODO: Make it such that the user is logged in when the account is created? 
class Command_CreateUser implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.CreateUser(data.flowUser.Username, data.flowUser.Password, client);
    let returnContent = {
      "Message": "message",
      "MessageType": "CreateUser",
      "WasSuccessful": returnData[0]
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])
    
    return returnMessage;
  }
}

class Command_DeleteUser implements ICommand
{
  async ExecuteCommand(data: any): Promise<[String, Array<String>]>
  {
    let returnData = await StateTracker.DeleteUser(data.Username, data.Password);
    let returnContent = {
      "MessageType": "DeleteUser",
      "WasSuccessful": returnData[0]
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])
    return returnMessage
  }
}
 
class Command_LoginUser implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.LoginUser(data.flowUser.Username, data.flowUser.Password, client);
    
    let returnContent = {
      "MessageType": "LoginUser",
      "WasSuccessful": returnData[0],
      "Message": returnData[2]
    };


    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1]);
    
    return returnMessage;
  }
}

class Command_LogoutUser implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.LogoutUser(data.flowUser.Username, data.flowUser.Password, client);
    let returnContent = {
      "Message": "message",
      "MessageType": "LogoutUser",
      "WasSuccessful": returnData[0]
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])
    
    return returnMessage;
  }
}

class Command_ReadUser implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.ReadUser(data.flowUser.Username, client);
    let returnContent = {};
    if(returnData[0] == null) {
      returnContent = {
        "MessageType": "ReadUser",
        "WasSuccessful": false
      }
    } else {
      returnContent = {
        "MessageType": "ReadUser",
        "WasSuccessful": true,
        "FlowUser": returnData[0]
      } 
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1]);

    return returnMessage;
  }
  
}

// // Room Commands

class Command_CreateRoom implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>  
  {
    // grab the projectID from the JSON, confirm format
    // TODO: ensure the message json is being extracted properly 
    let projectID = data.projectID;

    // send confirmation message & room code to client
    let returnData = await StateTracker.CreateRoom(projectID, client);
    let returnContent = {
      "MessageType": "CreateRoom",
      "WasSuccessful": returnData[0],
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1]);

    return returnMessage;
  }
}

class Command_JoinRoom implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    let returnData = await StateTracker.JoinRoom(data.Project.Id, data.user.Username, client); 
    let returnContent = {
      "MessageType": "JoinRoom",
      "WasSuccessful": true,
      "Message":returnData[0]
    }

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_PopulateRoom implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>
  {
    let returnData = await StateTracker.PopulateRoom(data.Project.Id, client);
    let returnContent = {
      "MessageType": "PopulateRoom",
      "WasSuccessful": false,
    } 

    if(returnData[0] != null)
    {
      let returnContent = {
        "MessageType": "PopulateRoom",
        "ObjectList": returnData[0]._ObjectList,
        "BehaviorList": returnData[0]._BehaviorList,
        "WasSuccessful": true,
      }
  
    } 

    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])
    return returnMessage;
  }
}

class Command_DeleteRoom implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]>  
  {
    throw new Error("Method not implemented.");
  }
}

// Object Commands
class Command_CreateObject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowObject = new FlowObject(data.flowObject);
    
    console.log(flowObject)

    let returnData = await StateTracker.CreateObject(flowObject, data.projectId);
    let returnContent = {
      "MessageType": "CreateObject",
      "FlowObject": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_DeleteObject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowObject = new FlowObject(data.flowObject);
    let returnData = await StateTracker.DeleteObject(flowObject.Id, data.projectId, client);
    let returnContent = {
      "MessageType": "DeleteObject",
      "Message": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_UpdateObject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowObject = new FlowObject(data.flowObject);
    let returnData = await StateTracker.UpdateObject(flowObject, data.projectId, client);
    let returnContent = {
      "MessageType": "UpdateObject",
      "FlowObject": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_ReadObject implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.ReadObject(data.flowObject.Id, data.projectId, client);
    let returnContent = {
      "MessageType": "ReadObject",
      "FlowObject": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;

  }
}


class Command_FinalizedUpdateObject implements ICommand
{
  async ExecuteCommand(data: any, client:string): Promise<[String, Array<String>]> 
  {
    let flowObject = new FlowObject(data.flowObject);
    let returnData = await StateTracker.UpdateObject(flowObject, data.projectId, client, true);
    let returnContent = {
      "MessageType": "UpdateObject",
      "FlowObject": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1]);
    
    return returnMessage;

  }
}

// Behavior Commands
class Command_CreateBehavior implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowBehavior = new FlowBehavior(data.flowBehavior);
    
    console.log(flowBehavior)

    let returnData = await StateTracker.CreateBehavior(flowBehavior, data.projectId);
    let returnContent = {
      "MessageType": "CreateBehavior",
      "FlowBehavior": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_DeleteBehavior implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowBehavior = new FlowBehavior(data.flowBehavior);
    let returnData = await StateTracker.DeleteBehavior(flowBehavior.Id, data.projectId, client);
    let returnContent = {
      "MessageType": "DeleteBehavior",
      "Message": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_UpdateBehavior implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let flowBehavior = new FlowBehavior(data.flowBehavior);
    let returnData = await StateTracker.UpdateBehavior(flowBehavior, data.projectId, client);
    let returnContent = {
      "MessageType": "UpdateBehavior",
      "FlowBehavior": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;
  }
}

class Command_ReadBehavior implements ICommand
{
  async ExecuteCommand(data: any, client: string): Promise<[String, Array<String>]> 
  {
    let returnData = await StateTracker.ReadBehavior(data.flowBehavior.Id, data.projectId, client);
    let returnContent = {
      "MessageType": "ReadBehavior",
      "FlowBehavior": returnData[0],
      "WasSuccessful": (returnData[0] == null) ? false: true,
    }
    let returnMessage = MessageBuilder.CreateMessage(returnContent, returnData[1])

    return returnMessage;

  }

}
/**
 * Holds the set of commands that can be executed and executes said commands 
 * with the provided data (JSON)
 */
export class CommandContext
{
  private _CommandList: Map<string, ICommand> = new Map<string, ICommand>();
  
  public CommandContext()
  {
  }

  /**
   * Executes the desired command
   * @param commandToExecute The command to be executed
   * @param data The data which is needed for the command to execute.
   */
  async ExecuteCommand(commandToExecute: string, data: any, client: string) : Promise<[String, Array<String>]>
  {
    if(this._CommandList.size == 0) {
      this._CommandList.set("CreateProject", new Command_CreateProject());
      this._CommandList.set("DeleteProject", new Command_DeleteProject());
      this._CommandList.set("OpenProject", new Command_OpenProject());
      this._CommandList.set("LeaveProject", new Command_LeaveProject());
      this._CommandList.set("ReadProject", new Command_ReadProject());
      this._CommandList.set("FetchProjects", new Command_FetchProjects());

      // User Commands
      this._CommandList.set("CreateUser", new Command_CreateUser());
      this._CommandList.set("DeleteUser", new Command_DeleteUser());
      this._CommandList.set("LoginUser", new Command_LoginUser());
      this._CommandList.set("LogoutUser", new Command_LogoutUser());
      this._CommandList.set("ReadUser", new Command_ReadUser());

      // Room Commands
      this._CommandList.set("CreateRoom", new Command_CreateRoom());
      this._CommandList.set("DeleteRoom", new Command_DeleteRoom());
      this._CommandList.set("JoinRoom", new Command_JoinRoom());
      this._CommandList.set("PopulateRoom", new Command_PopulateRoom());

      // Object Commands
      this._CommandList.set("CreateObject", new Command_CreateObject());
      this._CommandList.set("DeleteObject", new Command_DeleteObject());
      this._CommandList.set("UpdateObject", new Command_UpdateObject());
      this._CommandList.set("FinalizedUpdateObject", new Command_FinalizedUpdateObject());
      this._CommandList.set("ReadObject", new Command_ReadObject());

      // Behavior Commands
      this._CommandList.set("CreateBehavior", new Command_CreateBehavior());
      this._CommandList.set("DeleteBehavior", new Command_DeleteBehavior());
      this._CommandList.set("UpdateBehavior", new Command_UpdateBehavior());
      this._CommandList.set("ReadBehavior", new Command_ReadBehavior());
    }
    console.log(commandToExecute)
    
    return (await this._CommandList.get(commandToExecute).ExecuteCommand(data, client));
  }
}