/*
    Insight custom dashboard framework

    Framework for implementing Insight 4.x and 5.x dashboard views

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


    A Dashboard view is one which displays the contents of a hidden scenario
    This framework 
        creates the system folder if it doesnt exist
        creates a dashboard scenario for the current dashboard/user combination
        loads the scenario if it is unloaded
        overrides the view selection with this scenario, without changing the visible shelf
        displays an overlay if the dashboard scenario is queued/executing when the view renders, or if the view instigates the execution
        includes a refresh button which suppresses the default load confirmation dialog
        optional compares timestamp of dashboard scenario with other scenarios in the repository as a dependency check
*/

/* global insight */
/* global VDL */
/* global $ */
/* global ko */
/* global _ */
/* global Promise */


Dashboard.prototype = {
    /*
    PUBLIC INTERFACE
    */
    apiVersion: function() {
        var self = this;
        return self.api.getVersion();
    },
    start: function () {
        var self = this;

        // get the user
        return self._getCurrentUser()
            .then(user => { self.userId = user.id;})
            .then(self._findOrCreateSystemFolder.bind(this))
            .then(self._findOrCreateUserDashboardScenario.bind(this))
            .then(self._ensureUserDashboardScenarioLoaded.bind(this))
            .then(function () {
                // if we are doing dependency checking then start the checking
                if (self.config.dependencyCheck)
                    self._doDependencyChecking();
                return [self.scenarioId];
            })

            // no dashboard scenario selected is our error state
            .catch(function (error) {
                self.view.showErrorMessage(error);
                return []; // select no scenario
            });
    },
    refresh: function(execMode) {
        var self=this;
        /*return new Promise(function (resolve, reject) {
            self.view.withScenarios(0)
                .withSummaryData()
                .once(function (scenarios) {
                    try {
                        resolve(scenarios[0].getSummaryData().isLoaded());
                    } catch (exc) {
                        reject(exc);
                    }
                })
                .start();
            })
            .then(function () {
                return self.view.getScenarioProperties(0);
            })
            .then(function (props) {
                return props.execute(execMode, {
                    suppressClearPrompt: true // we dont want the prompt for a refresh
                });
            })*/

            return self.api.executeScenario(self.scenarioId, self.config.executionMode)
            .then(function () {
                // force the custom overlay on
                self._doOverlay(true);
            })
            .catch(function (error) {
                self.view.showErrorMessage('Failed to refresh the dashboard with ' + error);
                return Promise.reject();
            });
    },

    /*
    PRIVATE INTERFACE
    */
    _getCurrentUser: function() {
        var self=this;
        return self.api.getCurrentUser();
    },
    _findSystemFolder: function () {
        var self = this;
        return self.api.getRootFolders(self.appId)
            .then(folders => {
                    var found = false;
                    $.each(folders, function (i, v) {
                        if (self.config.systemFolder === v.name) {
                            found = v.id;
                        }
                    });
                    return found;
                })
            .catch(err => {
                    self.view.showErrorMessage("Failed to check for folder " + self.config.systemFolder + " existance with " + err);
                    return Promise.reject();
                }
            );
    },
    _createSystemFolder: function () {
        var self = this;

        return self.api.createRootFolder(self.app, self.config.systemFolder)
            .then(folder => {
                    if (folder.name !== self.config.systemFolder)
                        throw new Error("Permissions issue. Folder " + self.config.systemFolder + " exists but is not accessible");
                    return folder.id;
                }
            )
            .catch(err => {
                    self.view.showErrorMessage("Failed to create folder " + self.config.systemFolder + " with " + err);
                    return Promise.reject();
            });
    },
    _findOrCreateSystemFolder: function() {
        var self=this;

        return self._findSystemFolder()
        .then(function (found) {
            if (found) {
                self.folderId = found;
                return found;
            } else {
                // folder doesnt exist so create it
                return self._createSystemFolder()
                    .then(function (created) {
                        self.folderId = created;
                        // return the id
                        return created;
                    })
                    // and set it to fully shared
                    .then(function () {
                        return self._shareSystemFolder();
                    });
            }
        });
    },
    _shareSystemFolder: function () {
        var self = this;

        return self.api.shareFolder(self.folderId, "FULLACCESS")
            .then(success => success.id)
            .catch(err => {
                self.view.showErrorMessage("Failed to set dashboard folder to fully shared with " + err);
                return Promise.reject();
            });
    },
    _findUserDashboardScenario: function () {
        var self = this;

        var scenarioName = self.config.viewId + "." + self.userId;

        return self.api.getChildren(self.folderId)
            .then(children => {
                    var found = false;
                    $.each(children, function (i, v) {
                        if (scenarioName === v.name)
                            found = v.id;
                    });
                    return found;
                })
            .catch(err => {
                    self.view.showErrorMessage("Failed to check for scenario " + scenarioName + " existance with " + err);
                    return Promise.reject();
            });
    },
    _createUserDashboardScenario: function () {
        var self = this;

        var scenarioName = self.config.viewId + "." + self.userId;


        return self.api.createScenario(self.app, self.folderId, scenarioName, self.config.scenarioType)
            .then(scenario => scenario.id)
            .catch(err => {
                    self.view.showErrorMessage("Failed to create scenario " + scenarioName + " with " + err);
                    return Promise.reject();
                });
    },
    _findOrCreateUserDashboardScenario: function(){
        var self=this;

        return self._findUserDashboardScenario()
            .then(function (found) {
                // found the scenario
                if (found) {
                    self.scenarioId = found;
                    return self.scenarioId;
                } else {
                    return self._createUserDashboardScenario()
                        .then(function (created) {
                            // return the id
                            self.scenarioId = created;
                            return self.scenarioId;
                        });
                }
            });
    },
    _isUserDashboardScenarioLoaded: function () {
        var self = this;

        return self.api.getScenario(self.scenarioId)
            .then(scenario => scenario.loaded)
            .catch(err => {
                    self.view.showErrorMessage("Failed to check scenario " + self.scenarioId + " is loaded with " + err);
                    return Promise.reject();
                });
    },
    _loadUserDashboardScenario: function () {
        var self = this;

        return self.api.executeScenario(self.scenarioId, self.config.executionMode)
            .then(() => { return true;})
            .catch(err => {
                self.view.showErrorMessage("Failed to load scenario " + self.scenarioId + " with " + err);
                return Promise.reject();
            });
    },
    _isUserDashboardScenarioExecuting: function () {
        var self = this;

        // Insight 4, queued/executing <= existence of job
        if (self.api.getVersion() === 1)
            return self.api.getJob(self.scenarioId)
                .then(success => { return true; }, failure => { return false; });
        // Insight 5, queued/executing <= reserved for job flag on scenario
        else
            return self.api.getScenario(self.scenarioId)
                .then(scenario => scenario.summary.reservedForJob);
    },
    _ensureUserDashboardScenarioLoaded: function() {
        var self=this;
        
        return self._isUserDashboardScenarioLoaded()
            .then(function (loaded) {
                if (!loaded) {
                    // if the scenario is not loaded but is queued or executing already this will fail
                    self._loadUserDashboardScenario()
                        .then(function () {
                            // we know the scenario will be executing and to avoid any potential race condition we will
                            // show the overlay explicitly rather than test for execution status
                            self._doOverlay(true);
                        });
                }
                else {
                    // check if we need to put up the overlay for an already executing scenario
                    self._doOverlay();
                }
            });
    },
    _showOverlay: function (show) {
        var self = this;

        if (show) {
            $(document).trigger("dashboard.overlay.show"); // this will show the overlay
            // and assume we will be current when we are finished
            self.current(true);
        }
        else
            $(document).trigger("dashboard.overlay.hide"); // this will hide the overlay
    },
    _doOverlay: function (force) {
        var self = this;
        
        if (force !== undefined) {
            if (force)
                self._showOverlay(true);
            else
                self._showOverlay(false);
        }

        // start polling every interval
        self.polling = window.setInterval(
            self._updateOverlay.bind(self),
            1000 * self.config.executionPollingInterval
        );
    },
    _updateOverlay: function () {
        var self=this;
        return self._isUserDashboardScenarioExecuting()
            .then(function (status) {
                if (status) { // executing
                    self._showOverlay(true);
                } else {
                    self._showOverlay(false);
                    window.clearInterval(self.polling);
                }
            });
    },
    _dependencyModified: function (t) {
        var self = this;
        var exclusions  = ["/" + self.config.systemFolder].concat(self.config.dependencyExclusions);

        return self.api.getDashboardStatus(self.appId, t, self.config.dependencyPath, exclusions);
    },
    _getLastExecutionDate: function () {
        // needs to be a rest call as scenario selection not yet active
        var self = this;

       return self.api.getScenarioSummaryData(self.scenarioId)
            .then(summary => summary.lastExecutionDate)
           .catch(err => {
               self.view.showErrorMessage("Failed to get scenario summnary data " + self.scenarioId + " with " + err);
               return Promise.reject();
           });
    },
    _doDependencyChecking: function () {
        var self = this;

        // and start polling 
        window.setInterval(
            self._dependencyCheck.bind(self),
            1000 * self.config.dependencyPollingInterval
        );

        // do an immediate check
        return self._dependencyCheck();
    },
    _dependencyCheck: function () {
        var self=this;

        return self._getLastExecutionDate()
            .then(function (lastModified) {
                return self._dependencyModified(lastModified);
            })
            .then(function (modified) {
                self.current(!modified);
            });
    }
};
function Dashboard(userconfig) {
    var self=this;
    $.extend(self, {
        // configuration
        config: {
            viewId: null, // name of the dashboard view
            systemFolder: "_system", // location for the dashboard scenarios
            scenarioType: "SCENARIO", // optional custom type for the dashboard scenario
            executionMode: "LOAD", // custom load mode for running the dashboard scenairo
            executionPollingInterval: 1, // seconds between polls to see if the dashboard scenario has finished executing
            dependencyCheck: false, // should the dependency check be run automatically
            dependencyPollingInterval: 5, // seconds frequency for running the dependency check
            dependencyPath: "/", // repository path relative to the app that the dependency check starts from
            dependencyExclusions: [] // folders to exclude from the dependency check
        },

        // public observable state of the dashboard
        current: null,

        // internally captured ids
        appId: null,
        folderId: null, // the discovered or created system folder id
        scenarioId: null, // the discovered or created dashboard scenario for the current user
        userId: null
    }, userconfig);

    self.view = insight.getView();
    self.app = self.view.getApp();
    self.appId = self.app.getId();

    // auto detect the insight version number
    if (typeof insight.getVersion == 'undefined' || insight.getVersion().major === 4)
        self.api = new InsightRESTAPIv1();
    else
        self.api = new InsightRESTAPI();

    // integrate user provided config values
    $.extend(self.config, userconfig);

    // systemFolder must be in the root
    var regexp = /^[\/]*[\w\. ]+$/;
    if (!regexp.test(self.config.systemFolder ))
        throw new Error("Invalid system folder setting, must be a root folder");

    // dashboard uses custom overlay
    self.view.configure({
        executionOverlay: false
    });

    self.current = ko.observable(true);

     /*
    Custom overlay the dashboard framework can control, including custom text
    Disables default overlay
    */
    VDL('dashboard-overlay', {
        tag: 'dashboard-overlay',
        isContainer: false,
        attributes: [],
        template: '<div data-bind="visible: $component.showLoadingOverlay" class="dashboard-loading-overlay"> ' +
            '    <img class="dashboard-loading-img" alt="Loading.." src="" width="109" height="109"/>                    ' +
            '        <span class="dashboard-loading-text">Generating dashboard.. please wait.</span>     ' +
            '    </div>',
        createViewModel: function () {
            var vm = {
                showLoadingOverlay: ko.observable(false),
                registerEventListeners: function () {
                    $(window)
                        .on('dashboard.overlay.show', this.show.bind(this))
                        .on('dashboard.overlay.hide', this.hide.bind(this));
                },
                show: function () {
                    $('.dashboard-loading-img').attr('src', $('.view-initializing img').attr('src'));
                    this.showLoadingOverlay(true);
                },
                hide: function () {
                    this.showLoadingOverlay(false);
                }
            };
            vm.registerEventListeners();
            return vm;
        }
    });
    
    return self;
}

// REST API interface for v1 of the REST API (Insight 4)
function InsightRESTAPIv1() {
    var self = this;
    self.version = 1;
    return this;
}
InsightRESTAPIv1.prototype = {
    BASE_REST_ENDPOINT: '/data/',
    contentNegotiation: 'application/json',

    getVersion: function() {
        var self = this;
        return self.version;
    },
    restRequest: function(path, type, data, nobase) {
        var self = this;
        
        var url;
        if (nobase)
            url = "/" + path;
        else
            url = self.BASE_REST_ENDPOINT + path;
            
        var request = {
            url: insight.resolveRestEndpoint(url),
            type: type,
            data: data,
            headers: {
                'Accept': self.contentNegotiation,
                'Content-Type': self.contentNegotiation + ';charset=UTF-8'
            }
        };

        return new Promise(function(resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function(data, textStatus, jqXHR) {
                resolve(data);
            });

            jqXHR.fail(function(data, textStatus, jqXHR) {
                reject(textStatus);
            });
        });
    },
    getCurrentUser: function() {
        var self=this;
        return self.restRequest('auth/currentuser', 'GET', null, true); // this isnt under /data
    },
    getRootFolders: function(appId) {
        var self = this;
        return self.restRequest('project/' + appId + '/children?maxResults=9999', 'GET')
            .then(function(data) {
                var projects = [];
                var children = data.items;

                // filter out scenarios, projects are root folders
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (child.objectType === 'FOLDER')
                        projects.push(child);
                };

                // standardize on name
                for (var i = 0; i < projects.length; i++) {
                    projects[i].name = projects[i].displayName;
                    delete projects[i].displayName;
                }


                // sort case insensitive
                projects.sort(function(a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });

                return projects;
            });
    },
    getChildren: function(folderId) {
        var self = this;
        return self.restRequest('folder/' + folderId + '/children?maxResults=9999', 'GET')
            .then(function(data) {
                var children = data.items;

                // standarize naming property
                for (var i = 0; i < children.length; i++) {
                    children[i].name = children[i].displayName;
                    delete children[i].displayName;
                }
                return children;
            });
    },
    createScenario: function(app, parentId, name, type) {
        var self = this;

        var parent = {
            objectType: "FOLDER",
            id: parentId
        };

        return app.createScenario(parent, name, type)
            .then(function(scenario) {
                // standarize name property
                scenario.name = scenario.displayName;
                delete scenario.displayName;
                return scenario;
            });
    },
    createRootFolder: function(app, name) {
        var self = this;

        // no parent specified == root folder
        return app.createFolder(name)
            .then(function(folder) {
                // standarize name property
                folder.name = folder.displayName;
                delete folder.displayName;
                return folder;
            });
    },
    shareFolder: function(id, shareStatus) {
        var self = this;

        if (shareStatus !== "PRIVATE" && shareStatus !== "READONLY" && shareStatus !== "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('folder/' + id, 'POST', JSON.stringify(payload));
    },
    getScenario: function(id) {
      var self = this;
      return self.restRequest('scenario/' + id, 'GET')
          .then(scenario => {
              scenario.name = scenario.displayName;
              delete scenario.displayName;
              return scenario;
          });
    },
    getScenarioSummaryData: function(id) {
        var self=this;

        var payload = {}; // summary data only, no entities
        return self.restRequest('scenario/' + id + '/data', 'POST', JSON.stringify(payload))
        .then(response => response.summary);
    },
    executeScenario: function(id, mode) {
        var self=this;

        var payload = {
            id: id,
            objectType: "EXECUTION_REQUEST",
            jobType: mode
        };

        return self.restRequest('execution', 'POST', JSON.stringify(payload));
    },
    getJob: function(scenarioId) {
        var self=this;

        return self.restRequest('scenario/' + scenarioId + '/job', 'GET')
            .then(response => response.summary);
    },
    getDashboardStatus: function(appId, timestamp, path, exclusions) {
        var self=this;

        var payload = {
            timestamp: timestamp,
            path: path,
            exclusions: exclusions
        };

        return self.restRequest('project/' + appId + '/dashboard/status', 'POST', JSON.stringify(payload))
            .then(response => response.dataModifiedSinceTimestamp);
    }
}

// REST API interface for v2 of the REST API (Insight 5)
function InsightRESTAPI() {
    var self = this;
    self.version = 2;
    return this;
}
InsightRESTAPI.prototype = {
    BASE_REST_ENDPOINT: '/api/',
    contentNegotiation: 'application/vnd.com.fico.xpress.insight.v2+json',
    uploadPollingInterval: 1000,

    getVersion: function() {
        var self = this;
        return self.version;
    },
    restRequest: function(path, type, data, nobase) {
        var self = this;
        
        var url;
        if (nobase)
            url = "/" + path;
        else
            url = self.BASE_REST_ENDPOINT + path;
            
        var request = {
            url: insight.resolveRestEndpoint(url),
            type: type,
            data: data,
            headers: {
                'Accept': self.contentNegotiation,
                'Content-Type': self.contentNegotiation + ';charset=UTF-8'
            }
        };

        return new Promise(function(resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function(response) {
                if (response)
                    resolve(response);
                else
                    resolve();
            });

            jqXHR.fail(function(jqXHR) {
                var code;
                var message;

                // if there is a response body
                if (jqXHR.responseJSON) {
                    var response = jqXHR.responseJSON;

                    // prefer the more detailed inner error
                    if (response.error.innerError) {
                        code = response.error.innerError.code;
                        message = response.error.innerError.message;
                    } else {
                        code = response.error.code;
                        message = response.error.message;
                    }
                } else {
                    // theres no response body for this error so take the raw XHR object fields
                    code = jqXHR.status;
                    message = jqXHR.statusText;
                }
                reject(message);
            });
        });
    },
    getCurrentUser: function () {
      var self=this;
      return self.restRequest('authentication/current-user', 'GET');
    },
    getRootFolders: function(appId) {
        var self = this;
        return self.restRequest('apps/' + appId + '/children?page=0&size=9999', 'GET')
            .then(function(children) {
                var projects = [];
                children = children.content; // strip away the container

                // filter out scenarios, projects are root folders
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    // mask out those starting with underscore
                    if (child.objectType === 'FOLDER')
                        projects.push(child);
                };

                // sort case insensitive
                projects.sort(function(a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });

                return projects;
            });
    },
    getChildren: function(folderId) {
        var self = this;
        return self.restRequest('folders/' + folderId + '/children?page=0&size=9999', 'GET')
            .then(function(children) {
                return children.content; // strip away the container
            });
    },
    createScenario: function(app, parentId, name, type) {
        var self = this;

        var parent = {
            objectType: "FOLDER",
            id: parentId
        };

        return app.createScenario(parent, name, type)
            .then(function(scenario) {
                // standarize name property
                scenario.name = scenario.displayName;
                delete scenario.displayName;
                return scenario;
            });
    },
    createRootFolder: function(app, name) {
        var self = this;

        return app.createFolder(name)
            .then(function(folder) {
                // standarize name property
                folder.name = folder.displayName;
                delete folder.displayName;
                return folder;
            });
    },
    shareFolder: function(id, shareStatus) {
        var self = this;

        if (shareStatus !== "PRIVATE" && shareStatus !== "READONLY" && shareStatus !== "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('folders/' + id, 'PATCH', JSON.stringify(payload));
    },
    getScenario: function(id) {
        var self=this;
        return self.restRequest('scenarios/' + id, 'GET');
    },
    getScenarioSummaryData: function(id) {
        var self=this;

        var payload = {}; // summary data only, no entities
        return self.restRequest('scenarios/' + id + '/data', 'POST', JSON.stringify(payload))
            .then(response => response.summary);
    },
    executeScenario: function(id, mode) {
        var self=this;

        var payload = {
            executionMode: mode,
            scenario: {
                id: id,
                //objectType: "SCENARIO",
                //name
                //url
            }
        };

        return self.restRequest('jobs', 'POST', JSON.stringify(payload));
    },
    getDashboardStatus: function(appId, timestamp, path, exclusions) {
        // TODO v5 doesnt support status endpoint yet
        return Promise.resolve(false);
    }
}