import { useEffect } from "react";
import { ZoomMtg } from "@zoom/meetingsdk";
import { getZoomSignature } from "../api/meet.js";

ZoomMtg.setZoomJSLib(
  "https://source.zoom.us/3.9.0/lib",
  "/av"
);

export default function ZoomMeet({
  meet,
  autoJoin = true,
  userName,
  role,
}) {

  const joinMeeting = async () => {
    try {
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();


      const zoomRole =
  role === "trainer" || role === "admin"
    ? 1
    : 0;

const { signature, sdkKey } =
  await getZoomSignature(
    meet.meetingNumber,
    zoomRole
  );

      ZoomMtg.init({
        leaveUrl: window.location.origin,

        success: () => {
          ZoomMtg.join({
            signature,
            sdkKey,

            meetingNumber: Number(
              String(meet.meetingNumber).replace(/\s/g, "")
            ),

userName: userName || "Student",
            passWord: meet.password,

            success: (success) => {
              console.log("Zoom Joined", success);
            },

            error: (err) => {
              console.error("Zoom Join Error", err);

              alert(JSON.stringify(err, null, 2));
            },
          });
        },

        error: (err) => {
          console.error("Zoom Init Error", err);

          alert(JSON.stringify(err, null, 2));
        },
      });

    } catch (e) {
      console.error("Join meeting failed:", e);

      alert(JSON.stringify(e, null, 2));
    }
  };

  useEffect(() => {
    if (autoJoin && meet?.meetingNumber) {
      joinMeeting();
    }

    // eslint-disable-next-line
  }, [autoJoin, meet]);

  return null;
}