/*
    Insight custom dashboard framework

    Framework for implementing Insight 4.x dashboard views
    
    (c) Copyright 2019 Fair Isaac Corporation
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/* global insight
/* global Dashboard */

var dashboard = new Dashboard({
	viewId: "dashboard1",
	executionMode: "loadDashboard"
});
insight.getView().replaceSelection(
	dashboard.start()
);

// white background and some margin tweaks for chart
function chartModifier(defaults) {
	defaults.layout.paper_bgcolor = 'rgba(0,0,0,0)';
	defaults.layout.plot_bgcolor = 'rgba(0,0,0,0)';
	defaults.layout.margin = {
		l: 50,
		r: 50,
		b: 50,
		t: 20,
		pad: 0
	};
	return defaults;
}