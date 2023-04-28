// parkingData.js
const getParkingData = () => {
    return fetch('https://firebasestorage.googleapis.com/v0/b/lacontroller-2b7de.appspot.com/o/ParkingTic2020.json?alt=media&token=572e51d6-5ecf-429b-afab-3010f5250885')
      .then(response => response.json());
  };
  
  export default getParkingData;
  