import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
  getMetadata
} from "firebase/storage";
import "./App.css";
import {
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  CssBaseline,
} from "@mui/material";
import { TimePicker } from "@mui/lab";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const firebaseConfig = {
  apiKey: "AIzaSyBYC7pUCU8uW9GyLa2-eII1lE4OZxycwQo",
  authDomain: "catfeeder-9781b.firebaseapp.com",
  databaseURL: "https://catfeeder-9781b.firebaseio.com",
  projectId: "catfeeder-9781b",
  storageBucket: "catfeeder-9781b.appspot.com",
  messagingSenderId: "1066991608255",
  appId: "1:1066991608255:web:dc45932a9840338bbfc10a",
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const storage = getStorage();

const imageRef = storageRef(storage, "test.jpg");

const feedNowRef = ref(database, "feed_now");
const streamOnRef = ref(database, "stream_on");
const timerOnRef = ref(database, "timer_on");
const timerValueRef = ref(database, "timer_value");

function App() {
  const [feedNow, setFeedNow] = useState(false);
  const [streamOn, setStreamOn] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [timerValue, setTimerValue] = useState(new Date());
  const [streamUrl, setStreamUrl] = useState();
  const [streamCacheBreaker, setStreamCacheBreaker] = useState(Date.now());
  const [imageLabel, setImageLabel] = useState('');

  const updateImageData = async () => {
    const metadata = await getMetadata(imageRef);
    setImageLabel(`Photo time: ${metadata.timeCreated}`);
  }

  useEffect(() => {
    onValue(feedNowRef, (snapshot) => setFeedNow(snapshot.val()));
    onValue(streamOnRef, (snapshot) => setStreamOn(snapshot.val()));
    onValue(timerOnRef, (snapshot) => setTimerOn(snapshot.val()));
    onValue(timerValueRef, (snapshot) => setTimerValue(snapshot.val()));

    getDownloadURL(imageRef).then((url) => setStreamUrl(url));
    updateImageData();
  }, []);

  useEffect(() => {
    let interval = 0;
    if (streamOn) {
      interval = setInterval(() => {
        setStreamCacheBreaker(Date.now());
        updateImageData();
      }, 1000);
    }
    return () => {
      console.log("Clearing");
      clearInterval(interval);
    };
  }, [streamOn]);

  /*
    The input is only a time picker, but in the database it must be a datetime (because it is "next feeding")
    So if the time selected has already passed today, then we set the date ot tomorrow. Otherwise, we set it to today.
  */
  const setScheduledDate = (scheduledDatetime) => {
    const currentDateTime = new Date();
    scheduledDatetime.setFullYear(currentDateTime.getFullYear());
    scheduledDatetime.setMonth(currentDateTime.getMonth());
    scheduledDatetime.setDate(currentDateTime.getDate());
    if (currentDateTime >= scheduledDatetime) {
      scheduledDatetime.setDate(scheduledDatetime.getDate() + 1);
    }
    console.log(
      `current date: ${currentDateTime}\nNew scheduled date: ${scheduledDatetime}`
    );
    scheduledDatetime.setSeconds(0);
    scheduledDatetime.setMilliseconds(0);
    set(timerValueRef, scheduledDatetime.toISOString());
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="App">
          <header className="App-header">
            <Typography variant="h4">Tommy's Cat Feeder</Typography>
          </header>
          <div className="App-body">
            <img
              className="proof-of-life"
              src={`${streamUrl}&cachebreaker=${streamCacheBreaker}`}
              alt="Proof of life"
            ></img>
            <p>{imageLabel}</p>
            <FormControlLabel
              labelPlacement="start"
              label="Camera"
              control={
                <Switch
                  checked={streamOn}
                  onChange={(event) => set(streamOnRef, event.target.checked)}
                />
              }
            />
            <FormControlLabel
              labelPlacement="start"
              label="Scheduled"
              control={
                <Switch
                  checked={timerOn}
                  onChange={(event) => {
                    setScheduledDate(new Date(timerValue));
                    set(timerOnRef, event.target.checked);
                  }}
                />
              }
            />
            <TimePicker
              label="Feeding Time"
              disabled={!timerOn}
              value={timerValue}
              onChange={(newValue) => setTimerValue(newValue)}
              onAccept={(newValue) => {
                setScheduledDate(newValue);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
            <Button
              disabled={feedNow}
              variant="contained"
              onClick={() => set(feedNowRef, true)}
            >
              Feed that fat cat!
            </Button>
          </div>
        </div>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
