import json,sys,os
from openai_harmony import load_harmony_encoding,HarmonyEncodingName,Message,Role,Conversation
enc=load_harmony_encoding(HarmonyEncodingName.HARMONY_GPT_OSS)
messages=json.load(sys.stdin)
roles={"system":Role.SYSTEM,"developer":Role.DEVELOPER,"user":Role.USER,"assistant":Role.ASSISTANT}
conversation=Conversation.from_messages([Message.from_role_and_content(roles[m["role"]],m["content"]) for m in messages])
print(len(enc.render_conversation_for_completion(conversation,Role.ASSISTANT)))
