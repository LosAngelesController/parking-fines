import React, { useState, useEffect } from "react";
import BarChart from "@/components/BarChart";
import { Navbar } from "@mantine/core";
import Nav from "@/components/nav";

function App() {
  const [data, setData] = useState([]);
  const [hourData, setHourData] = useState([]);
  const [amountData, setAmountData] = useState([]);
  const [ticketamountData, setTicketData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch(
        "https://data.lacity.org/resource/wjz9-h9np.json?$limit=161289"
      );
      const jsonData = await response.json();

      // Aggregate ticket counts by year
      const countsByYear = jsonData.reduce((acc, ticket) => {
        const issueDate = ticket.issue_date;
        if (issueDate) {
          const year = issueDate.split("-")[0];
          if (acc[year]) {
            acc[year] += 1;
          } else {
            acc[year] = 1;
          }
        }
        return acc;
      }, {});

      // Aggregate ticket counts by hour
      const countsByHour = jsonData.reduce((acc, ticket) => {
        const issueTime = ticket.issue_time;
        if (issueTime) {
          const hour = issueTime.split(":")[0];
          if (acc[hour]) {
            acc[hour] += 1;
          } else {
            acc[hour] = 1;
          }
        }
        return acc;
      }, {});

      // Aggregate ticket amounts by year (how much money the city made on parking tickets each year)
      const amountsByYear = jsonData.reduce((acc, ticket) => {
        const issueDate = ticket.issue_date;
        if (issueDate) {
          const year = issueDate.split("-")[0];
          const amount = parseFloat(ticket.fine_amount);
          if (acc[year]) {
            acc[year] += amount;
          } else {
            acc[year] = amount;
          }
        }
        return acc;
      }, {});

      // Aggregate ticket based on ticket types.
      const countsByYearAndFine = jsonData.reduce((acc, ticket) => {
        const issueDate = ticket.issue_date;
        const fineAmount = Number(ticket.fine_amount);
        const ticketType = ticket.violation_description;
        if (issueDate && fineAmount && ticketType) {
          const year = issueDate.split("-")[0];
          if (!acc[year]) {
            acc[year] = {};
          }
          if (acc[year][fineAmount]) {
            if (acc[year][fineAmount][ticketType]) {
              acc[year][fineAmount][ticketType] += 1;
            } else {
              acc[year][fineAmount][ticketType] = 1;
            }
          } else {
            acc[year][fineAmount] = { [ticketType]: 1 };
          }
        }
        return acc;
      }, {});

      // const countsByYearAndFine = jsonData.reduce((acc, ticket) => {
      //   const issueDate = ticket.issue_date;
      //   const fineAmount = Number(ticket.fine_amount);
      //   const ticketType = ticket.violation_description;
      //   if (issueDate && fineAmount && ticketType) {
      //     const year = issueDate.split("-")[0];
      //     if (!acc[year]) {
      //       acc[year] = {};
      //     }
      //     if (acc[year][fineAmount]) {
      //       acc[year][fineAmount][ticketType] += 1;
      //     } else {
      //       acc[year][fineAmount] = { [ticketType]: 1 };
      //     }
      //   }
      //   return acc;
      // }, {});

      // Convert to an array of objects with label and value properties
      const data = Object.entries(countsByYear).map(([year, count]) => ({
        label: year,
        value: count,
      }));

      const hourData = Object.entries(countsByHour).map(([hour, count]) => ({
        label: hour,
        value: count,
      }));

      const amountData = Object.entries(amountsByYear).map(
        ([year, amount]) => ({
          label: year,
          value: amount,
        })
      );

      const ticketamountData = Object.entries(countsByYearAndFine).map(
        ([year, fineCounts]) => ({
          label: year,
          value: Object.values(fineCounts).reduce((acc, ticketCounts) => {
            return (
              acc +
              Object.values(ticketCounts).reduce((acc, count) => acc + count, 0)
            );
          }, 0),
        })
      );

      setData(data);
      setHourData(hourData);
      setAmountData(amountData);
      setTicketData(ticketamountData);
    }

    fetchData();
  }, []);

  const getColor = (label: string) => {
    switch (label) {
      case "2015":
        return "red";
      case "2016":
        return "orange";
      case "2017":
        return "yellow";
      case "2018":
        return "green";
      case "2019":
        return "blue";
      case "2020":
        return "indigo";
      case "2021":
        return "violet";
      default:
        return "black";
    }
  };

  return (
    <div className="App">
      <Nav></Nav>
      <h1>Number of Citations By Year</h1>
      <center>
        <BarChart data={data} width={400} height={300} color={getColor} />
      </center>

      <h1>Number of Citations By Hour</h1>
      <center>
        <BarChart data={hourData} width={400} height={300} color={getColor} />
      </center>

      <h1>Money Made on Parking Citations Each Year</h1>
      <center>
        <BarChart data={amountData} width={400} height={300} color={getColor} />
      </center>
      <h1>Number of Citations By Ticket Type</h1>
      <center>
        <BarChart
          data={ticketamountData}
          width={400}
          height={300}
          color={getColor}
        />
      </center>
    </div>
  );
}

export default App;
