import type { NextPage } from "next";
import Head from "next/head";
import { uploadMapboxTrack } from "../components/mapboxtrack";
import TooltipSlider, { handleRender } from "../components/TooltipSlider";
import { FeatureCollection, Feature } from "geojson";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import Nav from "../components/nav";
import { MantineProvider } from "@mantine/core";
import React, { useEffect, useState, useRef } from "react";
import Icon from "@mdi/react";
import { mdiSkipNext, mdiSkipPrevious } from "@mdi/js";
import CouncilDist from "./CouncilDistricts.json";
import  booleanPointInPolygon  from '@turf/boolean-point-in-polygon';
const councildistricts = require("./CouncilDistricts.json");
const citybounds = require("./citybounds.json");
import * as turf from "@turf/turf";
import { datadogRum } from "@datadog/browser-rum";
import mapboxgl from "mapbox-gl";
import geoData from "./parkings/ParkingTic2022.json";
import { computeclosestcoordsfromevent } from "@/components/getclosestcoordsfromevent";

const lastmonth = 13;
var cacheofcdsfromnames: any = {};

const Home: NextPage = () => {
  var councilBounds: any = {
    features: CouncilDist.features,
    type: "FeatureCollection",
  };
  interface GeoJSONData {
    type: string;
    features: Array<GeoJSONFeature>;
  }
  interface GeoJSONFeature {
    type: string;
    geometry: GeoJSONGeometry;
    properties: GeoJSONProperties;
  }
  interface GeoJSONGeometry {
    type: string;
    coordinates: Array<number>;
  }

  interface GeoJSONProperties {
    [key: string]: any;
  }

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
  const [options, setOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [optionsCd, setOptionsCd] = useState<any[]>([]);
  const [createdby, setcreatedby] = useState<string[]>(listofcreatedbyoptions);
  const [filteredcouncildistricts, setfilteredcouncildistricts] =
    useState<string>("");
  const shouldfilteropeninit =
    typeof window != "undefined" ? window.innerWidth >= 640 : false;

  const [showtotalarea, setshowtotalarea] = useState(false);
  let [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const isLoggedInRef = useRef(true);
  let [housingaddyopen, sethousingaddyopen] = useState(false);
  var mapref: any = useRef(null);
  const okaydeletepoints: any = useRef(null);
  const [sliderMonth, setsliderMonthAct] = useState<any>([1, lastmonth]);
  const [sliderYear, setsliderYearAct] = useState<any>([
    2019, 2020, 2021, 2022,
  ]);
  const [selectedfilteropened, setselectedfilteropened] = useState("violation");
  const [filterpanelopened, setfilterpanelopened] =
    useState(shouldfilteropeninit);

  const [normalizeintensityon, setnormalizeintensityon] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const datadogconfig: any = {
    applicationId: "54ed9846-68b0-4811-a47a-7330cf1828a0",
    clientToken: "pub428d48e3143310cf6a9dd00003773f12",
    site: "datadoghq.com",
    service: "311homeless",
    env: "prod",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "allow",
  };

  datadogRum.init(datadogconfig);

  datadogRum.startSessionReplayRecording();

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
      if (mapref.current.isStyleLoaded()) {
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

  var [hasStartedControls, setHasStartedControls] = useState(false);

  const divRef: any = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      // console.log("app render");
    }

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
      // /mapbox://styles/mapbox/dark-v11

      style: "mapbox://styles/kennethmejia/clh15tle3007z01r80z5c4tzf", // style URL (THIS IS STREET VIEW)
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

    const features: Feature[] = geoData.features.map((feature) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          feature.properties.Longitude,
          feature.properties.Latitude,
        ],
      },
      properties: {
        YEAR: feature.properties.YEAR,
        LOCATION: feature.properties.LOCATION,
        VIOLATION: feature.properties.VIOLATION,
        "# OF CITATIONS": feature.properties["# OF CITATIONS"],
        "$ FINE AMT": feature.properties["$ FINE AMT"],
        Full_Address: feature.properties.Full_Address,
        Latitude: feature.properties.Latitude,
        Longitude: feature.properties.Longitude,
      },
    }));
    // window.addEventListener("resize", handleResize);
    const geoJSONData: FeatureCollection = {
      type: "FeatureCollection",
      features: features,
    };
    let filteredData: FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    
    // Iterate through the geoJSONData features and check if each feature's location falls within the city boundaries
    geoData.features.forEach(feature => {
      // Check if the feature's location falls within the city boundaries
      if (booleanPointInPolygon(feature.geometry, citybounds.features[0].geometry)) {
        filteredData.features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              feature.properties.Longitude,
              feature.properties.Latitude,
            ],
          },
          properties: {
            YEAR: feature.properties.YEAR,
            LOCATION: feature.properties.LOCATION,
            VIOLATION: feature.properties.VIOLATION,
            "# OF CITATIONS": feature.properties["# OF CITATIONS"],
            "$ FINE AMT": feature.properties["$ FINE AMT"],
            Full_Address: feature.properties.Full_Address,
            Latitude: feature.properties.Latitude,
            Longitude: feature.properties.Longitude,
          },
        });
      }
    });
    // geoData.features.forEach(feature => {
    //   // Check if the feature's location falls within the city boundaries
    //   if (booleanPointInPolygon(feature.geometry, citybounds.features[0].geometry)) {
    //     filteredData.features.push(feature);
    //   }
    // });
    map.on("load", () => {
      // setdoneloadingmap(true);
      setshowtotalarea(window.innerWidth > 640 ? true : false);
      map.addSource("deathssource", {
        type: "geojson",
        data: filteredData,
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

      map.addLayer({
        id: "council-districts",
        type: "fill",
        source: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: councildistricts.features,
          },
        },
        paint: {
          "fill-color": "black",
          "fill-opacity": 0,
        },
      });
      if (normalizeintensityon) {
      } else {
        map.addLayer({
          id: "parkingtic2022-8jnj1t",
          type: "heatmap",
          source: "kennethmejia.dri9obtt",
          paint: {
            // "heatmap-color": [
            //   "interpolate",
            //   ["linear"],
            //   ["heatmap-density"],
            //   0,
            //   "rgba(0, 0, 255, 0)",
            //   0.1,
            //   "royalblue",
            //   0.3,
            //   "cyan",
            //   0.5,
            //   "lime",
            //   0.7,
            //   "yellow",
            //   1,
            //   "red",
            // ],
            "heatmap-opacity": 0.5,
            "heatmap-radius": 3,
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
          },
          filter: ["within", "city-boundaries-source"],
          // filter: [">", ["get", "# OF CITATIONS"], 40],
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
          "circle-stroke-width": 0,
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
        // filter: ["within", "city-boundaries-source"],
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
          const maxCitationObj = filteredfeatures.reduce(
            (maxObj: any, obj: any) => {
              if (
                obj.properties["# OF CITATIONS"] >
                maxObj.properties["# OF CITATIONS"]
              ) {
                return obj;
              } else {
                return maxObj;
              }
            }
          );
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

      map.loadImage("/map-marker.png", (error, image: any) => {
        if (error) throw error;

        // Add the image to the map style.
        map.addImage("map-marker", image);

        if (false) {
        }
      });
      map.addControl(geocoder2);

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

       // this will hide the places that is outside of the city of la boundaries. 
       map.setFilter("parkingtic2022-8jnj1t", ["within", citybounds]);

       
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
        // map.setFilter('parkingtic2022-8jnj1t', ['<', '# OF CITATIONS', 1]);
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
  }, [normalizeintensityon, selectAll]);

  const tooltipformattermonth = (value: number) => {
    var numberofyearstoadd = Math.floor((value - 1) / 12);

    const year = 2015 + numberofyearstoadd;

    var numberofmonthstosubtract = numberofyearstoadd * 12;

    var monthtoformat = value - numberofmonthstosubtract;

    return `${monthtoformat}/${year}`;
  };
  const handleChange = (event: any) => {
    const value = event.target.value;
    setSelectedOption(value);
    // onSelect(value);
    const filterExpression = ["all", ["in", "VIOLATION", value]];
    // console.log(filterExpression)
    mapref.current.setFilter("parkingtic2022-8jnj1t", filterExpression);
  };
  const setfilteredcouncildistrictspre = (event: any) => {
    // debugger
  // console.log(CouncilDist.features[0].geometry)
   if(event == ""){
   setSelectAll(!selectAll)
   }else if(event == "sndk"){
  mapref.current.setLayoutProperty("parkingtic2022-8jnj1t", 'visibility', 'none');
  mapref.current.setLayoutProperty("park-volcanoes", 'visibility', 'none');
   }else{
    const value = event.target.value;
    setfilteredcouncildistricts(value);
    const optionsC = CouncilDist.features.filter(
      (feature) => feature.properties.dist_name === value
    );
    const coordinates = optionsC[0].geometry;
    mapref.current.setFilter("parkingtic2022-8jnj1t", ["within", coordinates]);
   }
  };
 
  useEffect(() => {
    // Parse the GeoJSON data into an array of options

    const countsByYearAndFine = geoData.features.reduce(
      (acc: any, ticket: any) => {
        const ticketType = ticket.properties.VIOLATION;
        if (ticketType) {
          // const year = issueDate.split("-")[0];
          if (!acc[ticketType]) {
            acc[ticketType] = 0;
          }
          if (acc[ticketType]) {
            if (acc[ticketType]) {
              acc[ticketType] += 1;
            } else {
              acc[ticketType] = 1;
            }
          } else {
            acc[ticketType] = 1;
          }
        }
        return acc;
      },
      {}
    );
    const ticketamountData = Object.entries(countsByYearAndFine).map(
      ([year, fineCounts]) => ({
        label: year,
        value: fineCounts,
      })
    );
    const options = ticketamountData.map((feature) => feature.label);
    const optionsCd = CouncilDist.features.map(
      (feature) => feature.properties.dist_name
    );
    setOptions(options);
    setOptionsCd(optionsCd);
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
              <strong className="">Parking Tickets 2022</strong>
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
                  {/* Violation Button */}
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
                  {/* Council District Button */}
                  <button
                    onClick={() => {
                      setselectedfilteropened("cd");
                    }}
                    className={`px-2 border-b-2 py-1 font-semibold ${
                      selectedfilteropened === "cd"
                        ? "border-[#41ffca] text-[#41ffca]"
                        : "hover:border-white border-transparent text-gray-50"
                    }`}
                  >
                    CD #
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
                  {selectedfilteropened === "cd" && (
                    <>
                      <div className="pl-5 pr-2 py-2">
                        <div className="flex flex-row gap-x-1">
                          <button
                            className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                            onClick={() => {
                              setfilteredcouncildistricts("Selected All");
                              setfilteredcouncildistrictspre("");
                            }}
                          >
                            Select All
                          </button>
                          <button
                            className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base border border-gray-400"
                            onClick={() => {
                              setfilteredcouncildistricts("UnSelect");
                              setfilteredcouncildistrictspre("sndk");
                            }}
                          >
                            Unselect All
                          </button>
                        </div>
                        <select
                          value={filteredcouncildistricts}
                          onChange={setfilteredcouncildistrictspre}
                        >
                          <option value="">Select CD</option>
                          {optionsCd.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
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
    </div>
  );
};

export default Home;