// app/api.ts
export const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIzMzllZjQ0ZS1hYzk2LTQ5MjktYTk2NS05NTg2YmVkYjc0NDYiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1Mzg2MzM3NywiZXhwIjoxNzg1Mzk5Mzc3fQ.6CwnH5oP2JXu4INPl9CFPwspXL4fpzVRkPQWfJPYtn0";

// if you want to dynamically create a room…
export async function createMeeting(): Promise<string> {
  const resp = await fetch(
    "https://api.videosdk.live/v2/rooms",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ /* any options */ }),
    }
  );
  const { roomId } = await resp.json();
  return roomId;
}