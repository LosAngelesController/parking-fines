// parkingData.js
const getParkingData = () => {
    return fetch('https://firebasestorage.googleapis.com/v0/b/lacontroller-2b7de.appspot.com/o/ParkingTic2019.json?alt=media&token=4d327998-79c9-4ded-a328-4e5caaa27484')
      .then(response => response.json());
  };
  
  export default getParkingData;
  