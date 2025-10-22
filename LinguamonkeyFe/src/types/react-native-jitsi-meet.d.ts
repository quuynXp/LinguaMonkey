declare module 'react-native-jitsi-meet' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface JitsiMeetConferenceOptions {
    room: string;
    userInfo?: {
      displayName?: string;
      email?: string;
      avatar?: string;
    };
    audioOnly?: boolean;
    audioMuted?: boolean;
    videoMuted?: boolean;
    featureFlags?: Record<string, any>;
  }

  export interface JitsiMeetViewProps extends ViewProps {
    onConferenceTerminated?: (event: any) => void;
    onConferenceJoined?: (event: any) => void;
    onConferenceWillJoin?: (event: any) => void;
  }

  export class JitsiMeetView extends Component<JitsiMeetViewProps> {}

  const JitsiMeet: {
    call: (url: string, userInfo?: any) => void;
    audioCall: (url: string, userInfo?: any) => void;
    videoCall: (url: string, userInfo?: any) => void;
    endCall: () => void;
  };

  export default JitsiMeet;
}
