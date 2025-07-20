const term = new Terminal();
term.open(document.getElementById("terminal"));
const socket = io();

const cpuChartCtx = document.getElementById("cpuChart").getContext("2d");
const memoryChartCtx = document.getElementById("memoryChart").getContext("2d");
const diskChartCtx = document.getElementById("diskChart").getContext("2d");
const swapChartCtx = document.getElementById("swapChart").getContext("2d");

let cpuChart, memoryChart, diskChart, swapChart;

const createChart = (ctx, type, data, options) =>
  new Chart(ctx, {
    type: type,
    data: data,
    options: options,
  });

const updateChartData = (chart, data) => {
  chart.data.datasets[0].data = data;
  chart.update();
};

term.onData((data) => {
  socket.emit("data", data);
});

socket.on("output", (data) => {
  term.write(data);
});

socket.on("status", (status) => {
  console.log(status);
});

socket.on("systemStats", (stats) => {
  // CPU Usage Chart
  const cpuUsagePercent = parseFloat(stats.cpuUsage);
  if (!cpuChart) {
    cpuChart = createChart(
      cpuChartCtx,
      "doughnut",
      {
        labels: ["Used", "Free"],
        datasets: [
          {
            label: "CPU Usage",
            data: [cpuUsagePercent, 100 - cpuUsagePercent],
            backgroundColor: ["#FF0000", "#00FF00"],
          },
        ],
      },
      {
        responsive: true,
        maintainAspectRatio: false,
      },
    );
  } else {
    updateChartData(cpuChart, [cpuUsagePercent, 100 - cpuUsagePercent]);
  }

  // Memory Usage Chart
  const memoryUsagePercent = (
    (parseInt(stats.usedMemory) / parseInt(stats.totalMemory)) *
    100
  ).toFixed(2);
  if (!memoryChart) {
    memoryChart = createChart(
      memoryChartCtx,
      "bar",
      {
        labels: ["Memory Usage"],
        datasets: [
          {
            label: "Memory Usage %",
            data: [memoryUsagePercent],
            backgroundColor: "#FF6347",
          },
        ],
      },
      {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
          },
        },
      },
    );
  } else {
    updateChartData(memoryChart, [memoryUsagePercent]);
  }

  // Swap Usage Chart
  const swapUsagePercent = (
    (parseInt(stats.swapUsage.used) / parseInt(stats.swapUsage.total)) *
    100
  ).toFixed(2);
  if (!swapChart) {
    swapChart = createChart(
      swapChartCtx,
      "bar",
      {
        labels: ["Swap Usage"],
        datasets: [
          {
            label: "Swap Usage %",
            data: [swapUsagePercent],
            backgroundColor: "#32CD32",
          },
        ],
      },
      {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
          },
        },
      },
    );
  } else {
    updateChartData(swapChart, [swapUsagePercent]);
  }

  // Disk Usage Chart
  const diskUsagePercent = (
    (parseInt(stats.diskUsage.used) / parseInt(stats.diskUsage.total)) *
    100
  ).toFixed(2);
  if (!diskChart) {
    diskChart = createChart(
      diskChartCtx,
      "bar",
      {
        labels: ["Disk Usage"],
        datasets: [
          {
            label: "Disk Usage %",
            data: [diskUsagePercent],
            backgroundColor: "#4682B4",
          },
        ],
      },
      {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
          },
        },
      },
    );
  } else {
    updateChartData(diskChart, [diskUsagePercent]);
  }

  // CPU Usage
  document.getElementById("cpu").innerText = `${stats.cpuUsage}%`;

  // Memory Usage
  const totalMemoryGB = (parseInt(stats.totalMemory) / 1024).toFixed(2); // MB -> GB
  const usedMemoryGB = (parseInt(stats.usedMemory) / 1024).toFixed(2); // MB -> GB
  const freeMemoryGB = (parseInt(stats.freeMemory) / 1024).toFixed(2); // MB -> GB
  document.getElementById("memory").innerText =
    `${usedMemoryGB} GB / ${totalMemoryGB} GB`;

  // Swap Usage
  const totalSwapGB = (parseInt(stats.swapUsage.total) / (1024 * 1024)).toFixed(
    2,
  ); // Bytes -> GB
  const usedSwapGB = (parseInt(stats.swapUsage.used) / (1024 * 1024)).toFixed(
    2,
  ); // Bytes -> GB
  const freeSwapGB = (parseInt(stats.swapUsage.free) / (1024 * 1024)).toFixed(
    2,
  ); // Bytes -> GB
  document.getElementById("swap").innerText =
    `${usedSwapGB} GB / ${totalSwapGB} GB`;

  // Disk Usage
  document.getElementById("disk").innerText =
    `${stats.diskUsage.used} / ${stats.diskUsage.total}`;
});

function connect() {
  const host = document.getElementById("host").value;
  const port = parseInt(document.getElementById("port").value, 10);
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  term.clear();
  socket.emit("connectSSH", { host, port, username, password });
}
