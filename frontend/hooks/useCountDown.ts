// import { useCallback } from 'react';
// import LiveActivity from 'react-native-live-activity';

// // Please be careful to use the same type as the one you defined in your Swift module.
// type LiveActivityParams = {
//     status: string;
//     driverName: string;
//     expectedDeliveryTime: string;
// };

// const liveActivity = new LiveActivity<LiveActivityParams>();

// export function useLiveActivity() {
//     const startActivity = useCallback(async (params: LiveActivityParams) => {
//         const activity = await liveActivity.startActivity(params);
//         return activity;
//     }, []);

//     const endActivity = useCallback(async (activityId: string) => {
//         await liveActivity.endActivity(activityId);
//     }, []);

//     return {
//         startActivity,
//         endActivity,
//     };
// }


