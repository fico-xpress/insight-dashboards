# VDL Dashboard framework
A small framework that supports rendering Xpress Insight views which are independent of the user's scenario shelf selection. Such a view sits outside of the normal scenario-centric what-if workflow and can be used to report global metrics, summary state across scenarios etc.

### Pre-requisities
FICO Xpress Insight 4.50 or later

### Overview
The framework creates and loads a dashboard scenario to hold the data for the current dashboard view and user. The scenario selection from the shelf is invisibly replaced with the dashboard scenario. The framework provides a dedicated execution overlay (the built in one isn't aware of the selection replacement), refresh button and optional dependency check which searches a path for scenarios that have changed since the dashboard data was last collected.

### Basic usage
Declare a VDL view in the companion file as empty-selection-default="true". Every dashboard view needs this attribute set to true, which means the default dashboard will be the first one declared.

application.xml:
```xml
 <client>
    <view-group title="Main">
        <vdl-view title="Dashboard 1 - manual" path="dashboard1.vdl" empty-selection-default="true"/>
        <vdl-view title="Dashboard 2 - auto" path="dashboard2.vdl" empty-selection-default="true" />
    </view-group>
</client>
```

Include dashboardframework.js in your Insight project (recommended /client_resources/js) and reference in your VDL view.

dashboard1.vdl:
```html
<vdl version="4.5">
    <script src="js/dashboardframework.js" type="text/javascript"></script>
    <script src="js/dashboard1.js" type="text/javascript"></script>
    <vdl-page>
 ```
Initialize the framework in a view specific JavaScript include (up to and including Insight 4.50 there is a bug which prevents you putting this initialization call into an inline script block).

dashboard1.js:
```js
var dashboard = new Dashboard({
    viewId: "dashboard1"
});
insight.getView().replaceSelection(
    dashboard.start()
);
```
The minimum config you need to provide to the Dashboard constructor is a unique (for the dashboards in your app) string identifier (the viewId).
Dashboard.start() overrides the current shelf selection, selecting the scenario ("dashboard scenario") with path /{system folder}/{viewId}.{username}. If the system folder doesn’t exist it will be created. If the dashboard scenario doesn't exist then it will be created and executed.

Include an instance of the custom extension <dashboard-overlay> which implements an overlay during scenario execution which is aware of the hidden dashboard scenario.

dashboard1.vdl:
```html
<vdl-page>
        <dashboard-overlay></dashboard-overlay>
```

### Generating the dashboard data
By default the framework will execute the dashboard scenario with a LOAD. In a real app the LOAD will already have some purpose so typically you would specify a custom execution mode with clearinput=true.

dashboard1.js:
```js
var dashboard = new Dashboard({
    viewId: "dashboard1",
    executionMode: "loadDashboard"
});
insight.getView().replaceSelection(
    dashboard.start()
);
```
application.mos:
```
 !@insight.execmodes.loadDashboard.clearinput true
 procedure doLoadDashboard
```
### Dashboard styling
A basic tile styling is included. Add it to your VDL file.

dashboard1.vdl:
```html
<link href="css/dashboardframework.css" rel="stylesheet" type="text/css">
```
Tiles occupy the full width of the parent column. Tile height should be set with CSS.

dashboard1.vdl:
```html
<vdl-section class="dashboard" layout="fluid" vdl-if="=scenarios.length == 1">
    <vdl-row>
        <vdl-column size="6">
            <div class="tile">
                <div class="tile-header"><h4>Repository stats</h4></div>
                    <div class="tile-contents">
                        <!-- tile content here -->
                    </div>
                </div>
            </div>
        </vdl-column>
    </vdl-row>
</vdl-section>
```
### Adding a refresh button
The data held by the dashboard scenario may fall out of date as the state of the app evolves. One solution is to add a refresh button which re-executes the data collection. A dedicated refresh button integrated with the custom overlay is provided.
```html
<dashboard-refresh-button mode="loadDashboard"></dashboard-refresh-button>
```
The mode attribute should be set to the execution mode that generates the dashboard data.

### Error handling
If the dashboard encounters an unrecoverable error while initializing then the view selection will be empty and the root cause logged to the console

dashboard1.vdl:

```html
  <vdl-section id="error-message" layout="fluid" vdl-if="=scenarios.length != 1">
      <div class="alert alert-danger">
          <button type="button" class="close" data-dismiss="alert">×</button>
          <i class="fico-icon-notification-solid"></i>
          <strong>Error:</strong>
          <span class="error-text">Failed to generate dashboard.
          Please contact your system administrator for help.</span>
      </div>
  </vdl-section>
  ```

### Dependency checking
A dashboard typically reports on data collected from other scenarios, or from a data source such as a database which is manipulated by other scenarios. Therefore if any of these other scenarios have changed (executed or edited) since the dashboard scenario was last loaded with data then that dashboard data can reasonably be considered out of date.
The dashboard framework can perform this check on dependent scenarios automatically, set dependencyCheck to true in the constructor config.
By default the search for modified scenarios starts recursively from the app root and always excludes the system folder containing the dashboard scenarios. Both the starting path and the exclusion list can be customized.

dashboard1.js:

```js
var dashboard = new Dashboard({
        viewId: "dashboard1",
        executionMode: "loadDashboard",
        dependencyCheck: true
        //dependencyPath: "/somefolder/",
        //dependencyExclusions: ["anotherfolder"]
    });
insight.getView().replaceSelection(
    dashboard.start()
);
```
The dependency check is run at regular intervals and the result recorded in the observable property Dashboard.current. The example dashboard uses this to reveal a message to the user.

dashboard1.vdl:

```html
<vdl-section id="outofdate-message" layout="fluid" vdl-if="=!dashboard.current()">
    <div class="alert alert-info">
        <button type="button" class="close" data-dismiss="info">×</button>
        <i class="fico-icon-notification-solid"></i>
        <strong>Info:</strong>
        <span class="info-text">Dashboard may be out of date. Click the refresh button to re-generate with the latest data.</span>
    </div>
</vdl-section>
```

### Other configuration option
The following options can be set in the config parameter to the Dashboard constructor. Defaults shown below
```js
systemFolder: "_system",        // location for the dashboard scenarios
executionMode: "LOAD",          // custom load mode for running the dashboard scenairo
executionPollingInterval: 1,    // seconds between polls to see if the dashboard scenario has finished executing
dependencyCheck: false,         // should the dependency check be run automatically
dependencyPollingInterval: 5,   // seconds frequency for running the dependency check
dependencyPath: "/",            // repository path relative to the app that the dependency check starts from
dependencyExclusions: []        // folders to exclude from the dependency check
```

### Considerations for dashboard development

There are two potentially expensive operations of the dashboard lifecycle:
* data collecting
* dependency check

Dashboards typically summarize the state of a significant portion of the app and performance may degrade as the number of scenarios accumulates over time. A dashboard should be tested against a representative mature repository during development.

Other advice:
* reading data from a very large number of individual scenarios will be expensive. Consider having the scenarios write summary state to a database which can be efficiently queried.
* minimize the number of active scenarios in scope for the dashboard with a workflow that archives scenarios into an excluded folder, or stores active scenarios by .e.g month of the year and have the dashboard only work with the current month or a user selected filter


### Unit tests

Unit tests for the dashboard framework are implemented as Jasmine specs and can be executed by opening test/run.html.
