// parkingData.js
const getParkingData = () => {
  const url = 'https://firebasestorage.googleapis.com/v0/b/lacontroller-2b7de.appspot.com/o/ParkingTic2022.json?alt=media&token=a3c9f009-69fe-4c66-8597-fb85a8036c37';
  return fetch(url)
    .then(response => response.json());
};

module.exports = getParkingData;
