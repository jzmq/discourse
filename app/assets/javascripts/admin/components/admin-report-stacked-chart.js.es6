import Component from "@ember/component";
import { number } from "discourse/lib/formatter";
import loadScript from "discourse/lib/load-script";

export default Component.extend({
  classNames: ["admin-report-chart", "admin-report-stacked-chart"],

  init() {
    this._super(...arguments);

    this.resizeHandler = () =>
      Ember.run.debounce(this, this._scheduleChartRendering, 500);
  },

  didInsertElement() {
    this._super(...arguments);

    $(window).on("resize.chart", this.resizeHandler);
  },

  willDestroyElement() {
    this._super(...arguments);

    $(window).off("resize.chart", this.resizeHandler);

    this._resetChart();
  },

  didReceiveAttrs() {
    this._super(...arguments);

    Ember.run.debounce(this, this._scheduleChartRendering, 100);
  },

  _scheduleChartRendering() {
    Ember.run.schedule("afterRender", () => {
      if (!this.element) {
        return;
      }

      this._renderChart(
        this.model,
        this.element.querySelector(".chart-canvas")
      );
    });
  },

  _renderChart(model, chartCanvas) {
    if (!chartCanvas) return;

    const context = chartCanvas.getContext("2d");

    const chartData = Ember.makeArray(
      model.get("chartData") || model.get("data")
    );

    const data = {
      labels: chartData[0].data.map(cd => cd.x),
      datasets: chartData.map(cd => {
        return {
          label: cd.label,
          stack: "pageviews-stack",
          data: cd.data.map(d => Math.round(parseFloat(d.y))),
          backgroundColor: cd.color
        };
      })
    };

    loadScript("/javascripts/Chart.min.js").then(() => {
      this._resetChart();
      this._chart = new window.Chart(context, this._buildChartConfig(data));
    });
  },

  _buildChartConfig(data) {
    return {
      type: "bar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        hover: { mode: "index" },
        tooltips: {
          mode: "index",
          intersect: false,
          callbacks: {
            beforeFooter: tooltipItem => {
              let total = 0;
              tooltipItem.forEach(
                item => (total += parseInt(item.yLabel || 0, 10))
              );
              return `= ${total}`;
            },
            title: tooltipItem =>
              moment(tooltipItem[0].xLabel, "YYYY-MM-DD").format("LL")
          }
        },
        legend: { display: false },
        layout: {
          padding: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
          }
        },
        scales: {
          yAxes: [
            {
              stacked: true,
              display: true,
              ticks: {
                userCallback: label => {
                  if (Math.floor(label) === label) return label;
                },
                callback: label => number(label)
              }
            }
          ],
          xAxes: [
            {
              display: true,
              gridLines: { display: false },
              type: "time",
              offset: true,
              time: {
                parser: "YYYY-MM-DD",
                minUnit: "day"
              }
            }
          ]
        }
      }
    };
  },

  _resetChart() {
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  }
});
