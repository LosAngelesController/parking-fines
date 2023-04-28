import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, createRef } from "react";
import Slider from "rc-slider";
import { signintrack, uploadMapboxTrack } from "../components/mapboxtrack";
import TooltipSlider, { handleRender } from "../components/TooltipSlider";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import Nav from "../components/nav";
//import { CloseButton } from "@/components/CloseButton";
import { MantineProvider, Checkbox } from "@mantine/core";
import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";
import fs from "fs";
import csvParser from "csv-parser";
import Icon from "@mdi/react";
import { mdiPlay } from "@mdi/js";
import { mdiPause, mdiSkipNext, mdiSkipPrevious } from "@mdi/js";

import CouncilDist from "./CouncilDistricts.json";

import { useAuthState } from "react-firebase-hooks/auth";

const councildistricts = require("./CouncilDistricts.json");
const citybounds = require("./citybounds.json");
// @ts-ignore: Unreachable code error
import * as turf from "@turf/turf";
import { datadogRum } from "@datadog/browser-rum";

// added the following 6 lines.
import mapboxgl from "mapbox-gl";

import { assertDeclareExportAllDeclaration } from "@babel/types";

import { GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
// import YearSlider from "@/components/YearSlider";
// import geoJSONData from "./parkings/ParkingTic2020.json";
// import parkin from "./parking.csv"
import { computeclosestcoordsfromevent } from "@/components/getclosestcoordsfromevent";
const lastmonth = 13;
// console.log(geoJSONData.features)
function isTouchScreen() {
  return window.matchMedia("(hover: none)").matches;
}

var cacheofcdsfromnames: any = {};

function getLang() {
  if (navigator.languages != undefined) return navigator.languages[0];
  return navigator.language;
}

// var councilareasdistrict: any = {
//   "1": 39172374.513557486,
//   "2": 56028687.75752604,
//   "3": 91323827.86998883,
//   "4": 127051659.05853269,
//   "5": 85492955.75895034,
//   "6": 70583244.58359845,
//   "7": 140330608.52718654,
//   "8": 41642747.81303825,
//   "9": 33854278.76005373,
//   "10": 38455731.29742687,
//   "11": 165241605.83628467,
//   "12": 149947134.17462063,
//   "13": 42095086.21254906,
//   "14": 63974277.0096737,
//   "15": 83429528.39743595,
// };

// var councilpopulations: any = {
//   "1": 248124,
//   "2": 250535,
//   "3": 257098,
//   "4": 269290,
//   "5": 269182,
//   "6": 261114,
//   "7": 266276,
//   "8": 257597,
//   "9": 255988,
//   "10": 270703,
//   "11": 270691,
//   "12": 259564,
//   "13": 252909,
//   "14": 264741,
//   "15": 258310,
// };

// const councilcount: any = {
//   "13": 6380,
//   "11": 5350,
//   "5": 5102,
//   "2": 5063,
//   "3": 4338,
//   "6": 4050,
//   "10": 3961,
//   "14": 3920,
//   "1": 3905,
//   "9": 3892,
//   "12": 3243,
//   "4": 2942,
//   "7": 2689,
//   "8": 2332,
//   "15": 1681,
// };

// const createdbycount: any = {
//   BOE: 1,
//   BSS: 73,
//   "Council's Office": 2142,
//   ITA: 2978,
//   LASAN: 5518,
//   "Proactive Insert": 3,
//   "Self Service": 46007,
//   "Self Service_SAN": 1509,
// };

const Home: NextPage = () => {
  var councilBounds: any = {
    features: CouncilDist.features,
    type: "FeatureCollection",
  };

  const calculateifboxisvisible = () => {
    if (typeof window != "undefined") {
      return window.innerWidth > 640;
    } else {
      return true;
    }
  };

  const calculateIntensityCoefficient = () => {
    const monthdomain = sliderMonth[1] - sliderMonth[0];

    if (monthdomain === 0) {
      return 12;
    } else {
      const coefficient = 12 / monthdomain;

      return coefficient;
    }
  };

  const listofcreatedbyoptions = ["2019", "2020", "2021", "2022"];

  const listofcouncildists = Array.from({ length: 15 }, (_, i) => i + 1).map(
    (eachItem) => String(eachItem)
  );

  const [createdby, setcreatedby] = useState<string[]>(listofcreatedbyoptions);
  const [filteredcouncildistricts, setfilteredcouncildistricts] =
    useState<string[]>(listofcouncildists);

  const shouldfilteropeninit =
    typeof window != "undefined" ? window.innerWidth >= 640 : false;

  const [showtotalarea, setshowtotalarea] = useState(false);
  let [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const touchref = useRef<any>(null);
  const isLoggedInRef = useRef(true);
  let [housingaddyopen, sethousingaddyopen] = useState(false);
  var mapref: any = useRef(null);
  const okaydeletepoints: any = useRef(null);
  var [metric, setmetric] = useState(false);
  const [showInitInstructions, setshowInitInstructions] = useState(true);
  const [doneloadingmap, setdoneloadingmap] = useState(false);
  const [sliderMonth, setsliderMonthAct] = useState<any>([1, lastmonth]);
  const [sliderYear, setsliderYearAct] = useState<any>([
    2019, 2020, 2021, 2022,
  ]);
  const [selectedfilteropened, setselectedfilteropened] = useState("violation");
  const refismaploaded = useRef(false);
  const [filterpanelopened, setfilterpanelopened] =
    useState(shouldfilteropeninit);

  const [mapboxloaded, setmapboxloaded] = useState(false);

  const [normalizeintensityon, setnormalizeintensityon] = useState(false);

  const [isLoggedIn, setisLoggedIn] = useState(false);

  // const [user, loading, error] = useAuthState(auth);

  const datadogconfig: any = {
    applicationId: "54ed9846-68b0-4811-a47a-7330cf1828a0",
    clientToken: "pub428d48e3143310cf6a9dd00003773f12",
    site: "datadoghq.com",
    service: "311homeless",
    env: "prod",
    // Specify a version number to identify the deployed version of your application in Datadog
    // version: '1.0.0',

    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "allow",
  };

  datadogRum.init(datadogconfig);

  datadogRum.startSessionReplayRecording();

  // useEffect(() => {
  //   if (loading) {
  //     // maybe trigger a loading screen
  //     return;
  //   }
  //   if (user) {
  //     setisLoggedIn(true);
  //     isLoggedInRef.current = true;
  //     signintrack(
  //       user.email ? user.email : "nonefound",
  //       user.displayName ? user.displayName : "nonefound"
  //     );
  //   } else {
  //     setisLoggedIn(false);
  //   }

  //   // reassessLogin();
  // }, [user, loading]);

  const setsliderMonth = (event: Event, newValue: number | number[]) => {
    setsliderMonthAct(newValue as number[]);
  };

  const setsliderMonthVerTwo = (input: any) => {
    // console.log(input);
    setsliderMonthAct(input);
  };

  const setsliderYearVerTwo = (input: any) => {
    // console.log(input);
    setsliderYearAct(input);
  };

  const recomputeintensity = () => {
    let bruh = ["interpolate", ["linear"], ["zoom"], 7, 0.5, 22, 0.7];

    if (normalizeintensityon === true) {
      bruh = [
        "interpolate",
        ["linear"],
        ["zoom"],
        7,
        0.5 * calculateIntensityCoefficient(),
        20,
        0.4 * calculateIntensityCoefficient(),
      ];
    }

    var threeoneonelayer = mapref.current.getLayer("parkinglayer");

    if (threeoneonelayer) {
      mapref.current.setPaintProperty(
        "parkinglayer",
        "heatmap-intensity",
        bruh
      );
    }
  };

  useEffect(() => {
    if (mapref.current) {
      recomputeintensity();
      reassessLogin();
    }
  }, [normalizeintensityon]);

  function reassessLogin() {
    if (mapref.current) {
      if (
        // mapboxloaded ||
        mapref.current.isStyleLoaded()
        // refismaploaded.current === true
      ) {
        if (isLoggedInRef.current) {
          console.log("set visible 311");
          mapref.current.setLayoutProperty(
            "parkinglayer",
            "visibility",
            "visible"
          );
        } else {
          console.log("set none 311");
          mapref.current.setLayoutProperty(
            "parkinglayer",
            "visibility",
            "none"
          );
        }
      } else {
        console.log("mapbox not loaded");
      }
    } else {
      console.log("mapref not loaded");
    }
  }

  // useEffect(() => {
  // reassessLogin();

  //   setTimeout(() => {
  // reassessLogin();
  //   }, 5000);
  // }, [isLoggedIn]);

  const setcreatedbypre = (input: string[]) => {
    console.log("inputvalidator", input);
    if (input.length === 0) {
      setcreatedby(["bruh"]);
    } else {
      setcreatedby(input);
    }
  };

  const nextMonthAnimate = () => {
    if (sliderMonth[1] - sliderMonth[0] > 1) {
      setsliderMonthVerTwo([sliderMonth[0], sliderMonth[0]]);
    } else {
      if (sliderMonth[0] === lastmonth) {
        setsliderMonthVerTwo([1, 1]);
      } else {
        setsliderMonthVerTwo([sliderMonth[0] + 1, sliderMonth[0] + 1]);
      }
    }
  };

  const prevMonthAnimate = () => {
    if (sliderMonth[1] - sliderMonth[0] > 1) {
      setsliderMonthVerTwo([sliderMonth[0], sliderMonth[0]]);
    } else {
      if (sliderMonth[0] === 1) {
        setsliderMonthVerTwo([lastmonth, lastmonth]);
      } else {
        setsliderMonthVerTwo([sliderMonth[0] - 1, sliderMonth[0] - 1]);
      }
    }
  };

  const setfilteredcouncildistrictspre = (input: string[]) => {
    console.log("inputvalidator", input);
    if (input.length === 0) {
      setfilteredcouncildistricts(["99999"]);
    } else {
      setfilteredcouncildistricts(input);
    }
  };

  function closeModal() {
    setDisclaimerOpen(false);
  }

  function checkIfRingsNeedToBeCorrected(polygon: any) {
    console.log("checking if rings need to be corrected", polygon);

    var polygontoreturn = polygon;

    if (polygon.geometry.type == "Polygon") {
      if (polygon.geometry.coordinates.length <= 3) {
        polygontoreturn.geometry.coordinates = [
          ...polygon.geometry.coordinates,
          [
            polygon.geometry.coordinates[0][0] + 0.00000001,
            polygon.geometry.coordinates[0][1],
          ],
        ];
      } else {
      }
    } else {
    }

    return polygontoreturn;
  }

  function turfify(polygon: any) {
    var turffedpolygon;

    console.log("polygon on line 100", polygon);

    if (polygon.geometry.type == "Polygon") {
      turffedpolygon = turf.polygon(polygon.geometry.coordinates);
    } else {
      turffedpolygon = turf.multiPolygon(polygon.geometry.coordinates);
    }

    return turffedpolygon;
  }

  function polygonInWhichCd(polygon: any) {
    if (typeof polygon.properties.name === "string") {
      if (cacheofcdsfromnames[polygon.properties.name]) {
        return cacheofcdsfromnames[polygon.properties.name];
      } else {
        var turffedpolygon = turfify(polygon);

        const answerToReturn = councildistricts.features.find(
          (eachItem: any) => {
            //turf sucks for not having type checking, bypasses compile error Property 'booleanIntersects' does not exist on type 'TurfStatic'.
            //yes it works!!!! it's just missing types
            // @ts-ignore: Unreachable code error
            return turf.booleanIntersects(turfify(eachItem), turffedpolygon);
          }
        );

        cacheofcdsfromnames[polygon.properties.name] = answerToReturn;

        return answerToReturn;
      }
    }
  }

  function openModal() {
    setDisclaimerOpen(true);
  }

  var [hasStartedControls, setHasStartedControls] = useState(false);

  // function checkHideOrShowTopRightGeocoder() {
  //   var toprightbox = document.querySelector(".mapboxgl-ctrl-top-right");
  //   if (toprightbox) {
  //     var toprightgeocoderbox: any = toprightbox.querySelector(
  //       ".mapboxgl-ctrl-geocoder"
  //     );
  //     if (toprightgeocoderbox) {
  //       if (typeof window != "undefined") {
  //         if (window.innerWidth >= 768) {
  //           console.log("changing to block");
  //           toprightgeocoderbox.style.display = "block";
  //         } else {
  //           toprightgeocoderbox.style.display = "none";
  //           console.log("hiding");
  //         }
  //       } else {
  //         toprightgeocoderbox.style.display = "none";
  //       }
  //     }
  //   }
  // }

  // const handleResize = () => {
  //   checkHideOrShowTopRightGeocoder();
  // };

  const divRef: any = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // console.log("map div", divRef);

    if (divRef.current) {
      // console.log("app render");
    }

    // mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;
    //import locations from './features.geojson'

    mapboxgl.accessToken =
      "pk.eyJ1Ijoia2VubmV0aG1lamlhIiwiYSI6ImNsZG1oYnpxNDA2aTQzb2tkYXU2ZWc1b3UifQ.PxO_XgMo13klJ3mQw1QxlQ";

    const formulaForZoom = () => {
      if (typeof window != "undefined") {
        if (window.innerWidth > 700) {
          return 10;
        } else {
          return 9.1;
        }
      }
    };

    const urlParams = new URLSearchParams(
      typeof window != "undefined" ? window.location.search : ""
    );
    const latParam = urlParams.get("lat");
    const lngParam = urlParams.get("lng");
    const zoomParam = urlParams.get("zoom");
    const debugParam = urlParams.get("debug");

    var mapparams: any = {
      container: divRef.current, // container ID
      //affordablehousing2022-dev-copy
      style: "mapbox://styles/kennethmejia/clh163y7k006x01pz67s5bwzr", // style URL (THIS IS STREET VIEW)
      //mapbox://styles/comradekyler/cl5c3eukn00al15qxpq4iugtn
      //affordablehousing2022-dev-copy-copy
      //  style: 'mapbox://styles/comradekyler/cl5c3eukn00al15qxpq4iugtn?optimize=true', // style URL
      center: [-118.41, 34], // starting position [lng, lat]
      zoom: formulaForZoom(), // starting zoom
    };

    const map = new mapboxgl.Map(mapparams);
    mapref.current = map;

    var rtldone = false;

    try {
      if (rtldone === false && hasStartedControls === false) {
        setHasStartedControls(true);
        //multilingual support
        //right to left allows arabic rendering
        mapboxgl.setRTLTextPlugin(
          "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.10.1/mapbox-gl-rtl-text.js",
          (callbackinfo: any) => {
            console.log(callbackinfo);
            rtldone = true;
          }
        );
      }

      const language = new MapboxLanguage();
      map.addControl(language);
    } catch (error) {
      console.error(error);
    }

    // window.addEventListener("resize", handleResize);

    map.on("load", () => {
      // setdoneloadingmap(true);
      setshowtotalarea(window.innerWidth > 640 ? true : false);
      map.addSource("deathssource", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          // features: geoJSONData.features,
        },
      });
      map.addSource("city-boundaries-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: citybounds.features,
        },
      });

      map.addLayer({
        id: "city-boundaries",
        type: "line",
        source: "city-boundaries-source",
        paint: {
          "line-color": "#dddddd",
          "line-width": 2,
        },
        layout: {},
      });

      if (normalizeintensityon) {
        map.addLayer({
          id: "park-volcanoes2",
          type: "heatmap",
          source: "deathssource",
          paint: {
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.1,
              "royalblue",
              0.3,
              "cyan",
              0.5,
              "lime",
              0.7,
              "yellow",
              1,
              "#5A66D3",
            ],
            "heatmap-opacity": 0.6,
            "heatmap-radius": 10,
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
          },
          filter: ["<", ["get", "# OF CITATIONS"], 800],
        });
        map.addLayer({
          id: "park-volcanoes1",
          type: "heatmap",
          source: "deathssource",
          paint: {
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.1,
              "royalblue",
              0.3,
              "cyan",
              0.5,
              "lime",
              0.7,
              "yellow",
              1,
              "red",
            ],
            "heatmap-opacity": 1,
            "heatmap-radius": 10,
            "heatmap-weight": 1,
            "heatmap-intensity": 2,
          },
          filter: [">", ["get", "# OF CITATIONS"], 800],
        });
      } else {
        map.addLayer({
          id: "park-volcanoes2",
          type: "heatmap",
          source: "deathssource",
          paint: {
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.1,
              "royalblue",
              0.3,
              "cyan",
              0.5,
              "lime",
              0.7,
              "yellow",
              1,
              "#5A66D3",
            ],
            "heatmap-opacity": 0.6,
            "heatmap-radius": 10,
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
          },
          filter: ["<", ["get", "# OF CITATIONS"], 40],
        });
        map.addLayer({
          id: "park-volcanoes1",
          type: "heatmap",
          source: "deathssource",
          paint: {
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.1,
              "royalblue",
              0.3,
              "cyan",
              0.5,
              "lime",
              0.7,
              "yellow",
              1,
              "red",
            ],
            "heatmap-opacity": 1,
            "heatmap-radius": 10,
            "heatmap-weight": 1,
            "heatmap-intensity": 2,
          },
          filter: [">", ["get", "# OF CITATIONS"], 40],
        });
      }

      map.addLayer({
        id: "park-volcanoes",
        type: "circle",
        source: "deathssource",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            7,
            22,
            12,
            30,
            15,
          ],
          "circle-color": "hsl(60, 0%, 100%)",
          "circle-opacity": 0,
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            "hsl(0, 0%, 58%)",
            22,
            "hsl(0, 4%, 60%)",
          ],
          "circle-stroke-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11.46,
            0,
            13,
            0.17,
            15,
            1,
          ],
        },
        layout: {},
      });

      map.on("mousemove", "park-volcanoes", (e) => {
        // console.log("mousemove", e, e.features);

        if (e.features) {
          map.getCanvas().style.cursor = "pointer";
          const closestcoords: any = computeclosestcoordsfromevent(e);

          const filteredfeatures = e.features.filter((feature: any) => {
            return (
              feature.geometry.coordinates[0] === closestcoords[0] &&
              feature.geometry.coordinates[1] === closestcoords[1]
            );
          });
          const maxCitationObj = filteredfeatures.reduce((maxObj, obj) => {
            if (
              obj.properties["# OF CITATIONS"] >
              maxObj.properties["# OF CITATIONS"]
            ) {
              return obj;
            } else {
              return maxObj;
            }
          });
          const removeDuplicatesById = () => {
            const result = [];
            const map = new Map();

            for (const item of filteredfeatures) {
              if (!map.has(item.id)) {
                map.set(item.id, true);
                result.push(item);
              }
            }

            return result;
          };
          const uniqueArray = removeDuplicatesById();

          //     console.log(uniqueArray);
          // console.log(maxCitationObj.properties)
          const coordinates = closestcoords.slice();
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          if (filteredfeatures.length > 0) {
            if (filteredfeatures[0]) {
              if (filteredfeatures[0].properties) {
                if (filteredfeatures[0].properties) {
                  const allthelineitems = uniqueArray.map((eachdeath) => {
                    if (maxCitationObj.properties) {
                      // console.log(maxCitationObj.properties)
                      let address = maxCitationObj.properties["LOCATION"];
                      if (address === "N/A") {
                        address = "";
                      }
                      let city = maxCitationObj.properties["City"];
                      if (city === "N/A") {
                        city = "";
                      }

                      let vet = maxCitationObj.properties["# OF CITATIONS"];
                      if (vet === "N/A") {
                        vet = "";
                      }
                      let catSN = maxCitationObj.properties["$ FINE AMT"];
                      if (catSN === "N/A") {
                        catSN = "";
                      }

                      let dfs = maxCitationObj.properties["YEAR"];
                      if (dfs === "N/A") {
                        dfs = "";
                      }

                      // Include only values that are not "N/A"
                      return `
                  <li class="leading-none my-1">
                    <div class="location">${
                      maxCitationObj.properties["Location"] || ""
                    }</div>
                    <div class="address">
                      ${address ? `<span>${address}</span><br>` : ""}
                      ${city ? `<span>${city}</span>, ` : ""}
                
                    </div>
                    
                    ${
                      vet ? `<div class="vet"># of Citations: ${vet}</div>` : ""
                    }
                    <div class="animals">
                      ${catSN ? `<span>$ FINE AMT: ${catSN}</span><br>` : ""}
                      
                    </div>
                    ${dfs ? `<div class="discounted">Year: ${dfs}</div>` : ""}
                  </li>
                `;
                    }
                  });

                  popup
                    .setLngLat(coordinates)
                    .setHTML(
                      ` <div>
         
         
          <ul class='list-disc leading-none'>${
            allthelineitems.length <= 7
              ? allthelineitems.join("")
              : allthelineitems.splice(0, 7).join("")
          }</ul>
          
          ${
            allthelineitems.length >= 7
              ? `<p class="text-xs text-gray-300">Showing 10 of ${allthelineitems.length} deaths</p>`
              : ""
          }
        </div><style>
        .mapboxgl-popup-content {
          background: #212121e0;
          color: #fdfdfd;
        }

        .flexcollate {
          row-gap: 0.5rem;
          display: flex;
          flex-direction: column;
        }
        </style>`
                    )
                    .addTo(map);
                }
              }
            }
          }
        }
      });

      map.on("mouseleave", "park-volcanoes", () => {
        if (urlParams.get("stopmouseleave") === null) {
          map.getCanvas().style.cursor = "";
          popup.remove();
        }
      });
      okaydeletepoints.current = () => {
        try {
          var affordablepoint: any = map.getSource("selected-home-point");
          affordablepoint.setData(null);
        } catch (err) {
          console.error(err);
        }
      };

      const processgeocodereventresult = (eventmapbox: any) => {
        var singlePointSet: any = map.getSource("single-point");

        singlePointSet.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: eventmapbox.result.geometry,
            },
          ],
        });

        console.log("event.result.geometry", eventmapbox.result.geometry);
        console.log("geocoderesult", eventmapbox);
      };

      const processgeocodereventselect = (object: any) => {
        var coord = object.feature.geometry.coordinates;
        var singlePointSet: any = map.getSource("single-point");

        singlePointSet.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: object.feature.geometry,
            },
          ],
        });
      };

      const geocoder: any = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: map,
        proximity: {
          longitude: -118.41,
          latitude: 34,
        },
        marker: true,
      });

      var colormarker = new mapboxgl.Marker({
        color: "#41ffca",
      });

      const geocoderopt: any = {
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: {
          color: "#41ffca",
        },
      };

      const geocoder2 = new MapboxGeocoder(geocoderopt);
      const geocoder3 = new MapboxGeocoder(geocoderopt);

      geocoder.on("result", (event: any) => {
        processgeocodereventresult(event);
      });

      geocoder.on("select", function (object: any) {
        processgeocodereventselect(object);
      });

      var geocoderId = document.getElementById("geocoder");

      if (geocoderId) {
        console.log("geocoder div found");

        if (!document.querySelector(".geocoder input")) {
          geocoderId.appendChild(geocoder3.onAdd(map));

          var inputMobile = document.querySelector(".geocoder input");

          try {
            var loadboi = document.querySelector(
              ".mapboxgl-ctrl-geocoder--icon-loading"
            );
            if (loadboi) {
              var brightspin: any = loadboi.firstChild;
              if (brightspin) {
                brightspin.setAttribute("style", "fill: #e2e8f0");
              }
              var darkspin: any = loadboi.lastChild;
              if (darkspin) {
                darkspin.setAttribute("style", "fill: #94a3b8");
              }
            }
          } catch (err) {
            console.error(err);
          }

          if (inputMobile) {
            inputMobile.addEventListener("focus", () => {
              //make the box below go away
            });
          }
        }

        geocoder2.on("result", (event: any) => {
          processgeocodereventresult(event);
        });

        geocoder2.on("select", function (object: any) {
          processgeocodereventselect(object);
        });

        geocoder3.on("result", (event: any) => {
          processgeocodereventresult(event);
        });

        geocoder3.on("select", function (object: any) {
          processgeocodereventselect(object);
        });
      }

      map.addSource("single-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      if (true) {
        map.addLayer(
          {
            id: "point",
            source: "single-point",
            type: "circle",
            paint: {
              "circle-radius": 10,
              "circle-color": "#41ffca",
            },
          },
          "road-label"
        );
      }

      if (debugParam) {
        map.showTileBoundaries = true;
        map.showCollisionBoxes = true;
        map.showPadding = true;
      }

      if (urlParams.get("terraindebug")) {
        map.showTerrainWireframe = true;
      }

      // Create a popup, but don't add it to the map yet.
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.addSource("selected-park-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addSource("selected-park-area", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      if (false) {
        map.addLayer({
          id: "selected-park-areas",
          source: "selected-park-area",
          type: "line",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 5,
            "line-blur": 0,
          },
        });

        map.addLayer({
          id: "selected-park-areasfill",
          source: "selected-park-area",
          type: "fill",
          paint: {
            "fill-color": "#7dd3fc",
            "fill-opacity": 0.2,
          },
        });
      }

      map.loadImage("/map-marker.png", (error, image: any) => {
        if (error) throw error;

        // Add the image to the map style.
        map.addImage("map-marker", image);

        if (false) {
          map.addLayer({
            id: "points-park",
            type: "symbol",
            source: "selected-park-point",
            paint: {
              "icon-color": "#f0abfc",
              "icon-translate": [0, -13],
            },
            layout: {
              "icon-image": "map-marker",
              // get the title name from the source's "title" property
              "text-allow-overlap": true,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "text-ignore-placement": true,

              "icon-size": 0.4,
              "icon-text-fit": "both",
            },
          });
        }
      });

      // if (
      //   !document.querySelector(
      //     ".mapboxgl-ctrl-top-right > .mapboxgl-ctrl-geocoder"
      //   )
      // ) {
      map.addControl(geocoder2);
      // }

      // checkHideOrShowTopRightGeocoder();

      if (true) {
        map.addLayer(
          {
            id: "citybound",
            type: "line",
            source: {
              type: "geojson",
              data: citybounds,
            },
            paint: {
              "line-color": "#dddddd",
              "line-opacity": 1,
              "line-width": 3,
            },
          },
          "road-label"
        );
      }

      if (hasStartedControls === false) {
        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

        // Add geolocate control to the map.
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: true,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            showUserHeading: true,
          })
        );
      }

      // checkHideOrShowTopRightGeocoder();

      var mapname = "311";

      map.on("dragstart", (e) => {
        // reassessLogin();
        uploadMapboxTrack({
          mapname,
          eventtype: "dragstart",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("dragend", (e) => {
        // reassessLogin();
        uploadMapboxTrack({
          mapname,
          eventtype: "dragend",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("zoomstart", (e) => {
        // reassessLogin();
        uploadMapboxTrack({
          mapname,
          eventtype: "dragstart",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("zoomend", (e) => {
        // reassessLogin();
        uploadMapboxTrack({
          mapname,
          eventtype: "zoomend",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      //end of load
    });

    var getmapboxlogo: any = document.querySelector(".mapboxgl-ctrl-logo");

    if (getmapboxlogo) {
      getmapboxlogo.remove();
    }

    setInterval(() => {
      // reassessLogin();
    }, 1000);
  }, [normalizeintensityon]);

  const tooltipformattermonth = (value: number) => {
    var numberofyearstoadd = Math.floor((value - 1) / 12);

    const year = 2015 + numberofyearstoadd;

    var numberofmonthstosubtract = numberofyearstoadd * 12;

    var monthtoformat = value - numberofmonthstosubtract;

    return `${monthtoformat}/${year}`;
  };

  useEffect(() => {
    if (doneloadingmap) {
      var sliderMonthProcessed: string[] = [];

      var i = sliderMonth[0];

      while (i <= sliderMonth[1]) {
        var numberofyearstoadd = Math.floor((i - 1) / 12);

        const year = 2015 + numberofyearstoadd;

        var numberofmonthstosubtract = numberofyearstoadd * 12;

        var monthformatted = ("0" + (i - numberofmonthstosubtract)).slice(-2);

        i++;

        sliderMonthProcessed.push(year + "-" + monthformatted);
      }

      const filterinput = JSON.parse(
        JSON.stringify([
          "all",
          [
            "match",
            ["get", "CD #"],
            filteredcouncildistricts.map((x) => parseInt(x)),
            true,
            false,
          ],
          ["match", ["get", "Created By"], createdby, true, false],
          ["match", ["get", "Month"], sliderMonthProcessed, true, false],
        ])
      );

      console.log(filterinput);

      if (mapref.current) {
        if (doneloadingmap === true) {
          mapref.current.setFilter("parkinglayer", filterinput);
        }
      }
    }

    recomputeintensity();
    // reassessLogin();
  }, [createdby, filteredcouncildistricts, sliderMonth]);
  const handleYearChange = (year) => {
    // console.log("Selected year:", year);
    if (year[0] == "2022") {
      const filterExpression = ["all", ["in", "YEAR", "2022"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2019" && year[1] == "2021") {
      const filterExpression = ["all", ["in", "YEAR", "2019", "2020", "2021"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2019" && year[1] == "2020") {
      const filterExpression = ["all", ["in", "YEAR", "2019", "2020"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2019" && year[1] == "2019") {
      const filterExpression = ["all", ["in", "YEAR", "2019"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2020" && year[1] == "2020") {
      const filterExpression = ["all", ["in", "YEAR", "2020"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2021" && year[1] == "2021") {
      const filterExpression = ["all", ["in", "YEAR", "2021"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2022" && year[1] == "2022") {
      const filterExpression = ["all", ["in", "YEAR", "2022"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2021" && year[1] == "2022") {
      const filterExpression = ["all", ["in", "YEAR", "2021", "2022"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2020" && year[1] == "2022") {
      const filterExpression = ["all", ["in", "YEAR", "2020", "2021", "2022"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    } else if (year[0] == "2020" && year[1] == "2021") {
      const filterExpression = ["all", ["in", "YEAR", "2020", "2021"]];
      mapref.current.setFilter("park-volcanoes", filterExpression);
    }
  };
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectedOption(value);
    // onSelect(value);
    const filterExpression = ["all", ["in", "VIOLATION", value]];
    mapref.current.setFilter("park-volcanoes1", filterExpression);
  };
  useEffect(() => {
    // Parse the GeoJSON data into an array of options

    // const countsByYearAndFine = geoJSONData.features.reduce((acc, ticket) => {
    //   const ticketType = ticket.properties.VIOLATION;
    //   if (ticketType) {
    //     // const year = issueDate.split("-")[0];
    //     if (!acc[ticketType]) {
    //       acc[ticketType] = 0;
    //     }
    //     if (acc[ticketType]) {
    //       if (acc[ticketType]) {
    //         acc[ticketType] += 1;
    //       } else {
    //         acc[ticketType] = 1;
    //       }
    //     } else {
    //       acc[ticketType] = 1;
    //     }
    //   }
    //   return acc;
    // }, {});
    // const ticketamountData = Object.entries(countsByYearAndFine).map(
    //   ([year, fineCounts]) => ({
    //     label: year,
    //     value: fineCounts,
    //   })
    // );
    // const options = ticketamountData.map((feature) => feature.label);

    // setOptions(options);

    // console.log(ticketamountData)
  }, []);
  return (
    <div className="flex flex-col h-full w-screen absolute">
      <MantineProvider
        theme={{ colorScheme: "dark" }}
        withGlobalStyles
        withNormalizeCSS
      >
        <Head>
          <link
            rel="icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-32x32.png"
            sizes="32x32"
          />
          <link
            rel="icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-192x192.png"
            sizes="192x192"
          />
          <link
            rel="apple-touch-icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-180x180.png"
          />
          <meta
            name="msapplication-TileImage"
            content="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-270x270.png"
          />

          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
          <title>Parking Citation | Map</title>
          <meta property="og:type" content="website" />
          <meta name="twitter:site" content="@lacontroller" />
          <meta name="twitter:creator" content="@lacontroller" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            key="twittertitle"
            content="Parking Citations | Map"
          ></meta>
          <meta
            name="twitter:description"
            key="twitterdesc"
            content="Requests to the City of Los Angeles for parking tickets."
          ></meta>
          <meta
            name="twitter:image"
            key="twitterimg"
            content="https://firebasestorage.googleapis.com/v0/b/lacontroller-2b7de.appspot.com/o/parkingcitation-banner.png?alt=media&token=07acf984-2e7d-4120-a9d5-711a47d6c187"
          ></meta>
          <meta
            name="description"
            content="Requests to the City of Los Angeles for parking tickets."
          />

          <meta
            property="og:url"
            content="https://parkingcitations.lacontroller.io/"
          />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="Parking Citations | Map" />
          <meta
            property="og:description"
            content="Requests to the City of Los Angeles for parking tickets."
          />
          <meta
            property="og:image"
            content="https://firebasestorage.googleapis.com/v0/b/lacontroller-2b7de.appspot.com/o/parkingcitation-banner.png?alt=media&token=07acf984-2e7d-4120-a9d5-711a47d6c187"
          />
        </Head>

        <div className="flex-none">
          <Nav />
        </div>

        <div className="flex-initial h-content flex-col flex z-50">
          <div className="   max-h-screen flex-col flex z-5">
            <div
              className="absolute mt-[3.1em] md:mt-[3.8em] md:ml-3 top-0 z-5 titleBox  ml-2 text-base bold md:semi-bold break-words bg-[#212121]"
              style={{
                backgroundColor: "#212121",
                color: "#ffffff",
              }}
            >
              <strong className="">Parking Tickets 2020</strong>
            </div>

            <div
              className={`geocoder absolute mt-[2.7em] md:mt-[4.1em] ml-1 left-1 md:hidden xs:text-sm sm:text-base md:text-lg`}
              id="geocoder"
            ></div>

            <div className="absolute mt-[7.9em] md:mt-[5.8em] ml-2 md:ml-3 top-0 z-5 flex flex-row gap-x-2">
              <button
                onClick={() => {
                  setfilterpanelopened(!filterpanelopened);
                }}
                className="mt-2 rounded-full px-3 pb-1.5 pt-0.5 text-sm bold md:text-base bg-gray-800 bg-opacity-80 text-white border-white border-2"
              >
                <svg
                  style={{
                    width: "20px",
                    height: "20px",
                  }}
                  viewBox="0 0 24 24"
                  className="inline align-middle mt-0.5"
                >
                  <path
                    fill="currentColor"
                    d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"
                  />
                </svg>
                <span>Filter</span>
              </button>
            </div>

            <div
              className={` bottom-0 sm:bottom-auto sm:mt-[5.1em] md:mt-[5.8em] md:ml-3 w-screen sm:w-auto 
            ${filterpanelopened === true ? "absolute " : "hidden"}
            `}
            >
              <div className="bg-zinc-900 w-content bg-opacity-90 px-2 py-1 mt-1 sm:rounded-lg">
                <div className="gap-x-0 flex flex-row w-full">
                  <button
                    onClick={() => {
                      setselectedfilteropened("violation");
                    }}
                    className={`px-2 border-b-2 py-1 font-semibold ${
                      selectedfilteropened === "violation"
                        ? "border-[#41ffca] text-[#41ffca]"
                        : "hover:border-white border-transparent text-gray-50"
                    }`}
                  >
                    Violation
                  </button>

                  {false && (
                    <button
                      onClick={() => {
                        setselectedfilteropened("neigh");
                      }}
                      className={`px-2 border-b-2 py-1  font-semibold ${
                        selectedfilteropened === "neigh"
                          ? "border-[#41ffca] text-[#41ffca]"
                          : "hover:border-white border-transparent text-gray-50"
                      }`}
                    >
                      Neighborhood
                    </button>
                  )}
                </div>
                <div className="flex flex-col">
                  {selectedfilteropened === "createdby" && (
                    <div className="mt-2">
                      <div className="flex flex-row gap-x-1">
                        {/* <button
                          className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                          onClick={() => {
                            setcreatedbypre(listofcreatedbyoptions);
                          }}
                        >
                          Select All
                        </button> */}
                        {/* <button
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base border border-gray-400"
                          onClick={() => {
                            setcreatedbypre([]);
                          }}
                        >
                          Unselect All
                        </button> */}
                        {/* <button
                          onClick={() => {
                            setcreatedbypre(
                              listofcreatedbyoptions.filter(
                                (n) => !createdby.includes(n)
                              )
                            );
                          }}
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base  border border-gray-400"
                        >
                          Invert
                        </button> */}
                      </div>
                      {/* <Checkbox.Group
                        value={createdby}
                        onChange={setcreatedbypre}
                      >
                        {" "}
                        <div className="flex flex-col">
                          {listofcreatedbyoptions.map((item, key) => (
                            <Checkbox
                              value={item}
                              label={`${item} (${Number(
                                createdbycount[item]
                              ).toLocaleString()})`}
                              key={key}
                            />
                          ))}
                        </div>
                      </Checkbox.Group> */}
                    </div>
                  )}
                  {/* {selectedfilteropened === "cd" && (
                    <div className="mt-2">
                      <div className="flex flex-row gap-x-1">
                        <button
                          className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                          onClick={() => {
                            setfilteredcouncildistrictspre(listofcouncildists);
                          }}
                        >
                          Select All
                        </button>
                        <button
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base border border-gray-400"
                          onClick={() => {
                            setfilteredcouncildistrictspre([]);
                          }}
                        >
                          Unselect All
                        </button>
                        <button
                          onClick={() => {
                            setfilteredcouncildistrictspre(
                              listofcouncildists.filter(
                                (n) => !filteredcouncildistricts.includes(n)
                              )
                            );
                          }}
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base  border border-gray-400"
                        >
                          Invert
                        </button>
                      </div>
                      <Checkbox.Group
                        value={filteredcouncildistricts}
                        onChange={setfilteredcouncildistrictspre}
                      >
                        {" "}
                        <div className="grid grid-cols-3 gap-x-4 sm:flex sm:flex-col">
                          {listofcouncildists.map((item, key) => (
                            <Checkbox
                              value={item}
                              label={`${item} (${Number(
                                councilcount[String(item)]
                              ).toLocaleString()})`}
                              key={key}
                            />
                          ))}
                        </div>
                      </Checkbox.Group>
                    </div>
                  )} */}
                  {selectedfilteropened === "createdby" && (
                    <>
                      <div className="pl-5 pr-2 py-2">
                        <div className="pb-1">
                          <button
                            className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                            onClick={() => {
                              setsliderYearAct(2022);
                            }}
                          >
                            Select All Years
                          </button>
                        </div>
                        <YearSlider onChange={handleYearChange} />

                        {/* <TooltipSlider
                          range
                          min={2019}
                          max={2022}
                          value={sliderMonth}
                          onChange={setsliderYearVerTwo}
                          tipFormatter={(value: any) =>
                            `${tooltipformattermonth(value)}`
                          }
                        /> */}
                        <div className="flex flex-row py-1">
                          <p className="font-semibold">2019</p>
                          <p className="font-semibold ml-auto mr-0">2022</p>
                        </div>
                      </div>
                    </>
                  )}
                  {selectedfilteropened === "month" && (
                    <>
                      <div className="pl-5 pr-2 py-2">
                        <div className="pb-1">
                          <button
                            className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                            onClick={() => {
                              setsliderMonthAct([1, lastmonth]);
                            }}
                          >
                            Select All Months
                          </button>
                        </div>
                        <TooltipSlider
                          range
                          min={1}
                          max={lastmonth}
                          value={sliderMonth}
                          onChange={setsliderMonthVerTwo}
                          tipFormatter={(value: any) =>
                            `${tooltipformattermonth(value)}`
                          }
                        />
                        <div className="flex flex-row py-1">
                          <p className="font-semibold">
                            {tooltipformattermonth(sliderMonth[0])}
                          </p>
                          <p className="font-semibold ml-auto mr-0">
                            {tooltipformattermonth(sliderMonth[1])}
                          </p>
                        </div>
                        <p>Click Arrows</p>
                        <div>
                          <div className="px-3 py-2 flex flex-row gap-x-2">
                            <button
                              onClick={() => {
                                prevMonthAnimate();
                              }}
                              className="px-3 py-2 rounded-lg  bg-slate-800"
                            >
                              {" "}
                              <Icon path={mdiSkipPrevious} size={1} />
                            </button>
                            <button
                              className="px-3 py-2 rounded-lg bg-slate-800"
                              onClick={() => {
                                nextMonthAnimate();
                              }}
                            >
                              <Icon path={mdiSkipNext} size={1} />
                            </button>
                            {/*<Icon path={mdiPause} size={1} />*/}
                          </div>
                          <div>
                            <input
                              onChange={(e) => {
                                setnormalizeintensityon(e.target.checked);
                              }}
                              className="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer"
                              type="checkbox"
                              id="flexCheckChecked"
                              checked={normalizeintensityon}
                            />
                            <label
                              className="form-check-label inline-block text-gray-100"
                              htmlFor="flexCheckChecked"
                            >
                              Normalize Intensity
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {selectedfilteropened === "violation" && (
                    <>
                      <div className="pl-5 pr-2 py-2">
                        <div className="pb-1">
                          <button
                            className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                            onClick={() => {
                              setsliderYearAct(2022);
                            }}
                          >
                            Select Violation Type
                          </button>
                        </div>
                        <select value={selectedOption} onChange={handleChange}>
                          <option value="">Select an option</option>
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>

                        <div>
                          <input
                            onChange={(e) => {
                              setnormalizeintensityon(e.target.checked);
                            }}
                            className="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer"
                            type="checkbox"
                            id="flexCheckChecked"
                            checked={normalizeintensityon}
                          />
                          <label
                            className="form-check-label inline-block text-gray-100"
                            htmlFor="flexCheckChecked"
                          >
                            Normalize Intensity
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-content"></div>

            <div
              className={`text-sm ${
                housingaddyopen
                  ? `px-3 pt-2 pb-3 fixed sm:relative 

 top-auto bottom-0 left-0 right-0
  w-full sm:static sm:mt-2 sm:w-auto 
  sm:top-auto sm:bottom-auto sm:left-auto 
  sm:right-auto bg-gray-900 sm:rounded-xl 
   bg-opacity-80 sm:bg-opacity-80 text-white 
   border-t-2  sm:border border-teal-500 sm:border-grey-500
  
   
   `
                  : "hidden"
              }`}
            ></div>
          </div>
        </div>

        <div ref={divRef} style={{}} className="map-container w-full h-full " />

        {(typeof window !== "undefined" ? window.innerWidth >= 640 : false) && (
          <>
            <div
              className={`absolute md:mx-auto z-9 bottom-2 left-1 md:left-1/2 md:transform md:-translate-x-1/2`}
            >
              <a
                href="https://controller.lacontroller.gov/"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://lacontroller.io/images/KennethMejia-logo-white-elect.png"
                  className="h-9 md:h-10 z-40"
                  alt="Kenneth Mejia LA City Controller Logo"
                />
              </a>
            </div>
          </>
        )}
      </MantineProvider>
      {/* {isLoggedIn === false && (
        <>
          <div className="fixed w-full h-full top-0 bottom-0 left-0 right-0 bg-slate-900 bg-opacity-80"></div>
          <div className="absolute w-full sm:w-64 sm:h-64 bottom-0 sm:inset-x-0 sm:inset-y-0 sm:max-w-max sm:max-y-auto sm:m-auto bg-gray-700 border-2 rounded-lg px-2 py-2">
            {loading === false && (
              <>
                <p className="text-base md:text-lg font-bold text-white text-center">
                  Sign In with Google
                </p>
                <p className="text-gray-200">
                  This map is locked, sign in before accessing it.
                </p>
              </>
            )}

            {loading && (
              <>
                <p className="text-gray-200 italics">Loading...</p>

                <br />
                <div className="mx-auto flex justify-center items-center">
                  {" "}
                  <svg
                    aria-hidden="true"
                    className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-500"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                </div>
              </>
            )}
            <br />
            <button
              onClick={signInWithGoogle}
              className="w-full bg-blue-900 hover:bg-blue-800 text-gray-50 font-bold py-2 px-4 rounded"
            >
              Sign in With Google
            </button>
          </div>
        </>
      )} */}
    </div>
  );
};

export default Home;
