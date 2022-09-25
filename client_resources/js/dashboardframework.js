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
    // find a folder in the root
    findFolder: function () {
        var self = this;

        return $.ajax({
            url: self.apiBase + 'data/project/' + self.appId + '/folder',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8'
        })
            .then(
                function (response) {
                    var found = false;
                    $.each(response.items, function (i, v) {
                        if (self.config.systemFolder === v.displayName) {
                            found = v.id;
                        }
                    });
                    return found;
                },
                function (failed) {
                    throw new Error("Failed to check for folder " + self.config.systemFolder + " existance with " + failed);
                }
            );
    },

    // create a folder in the root
    createFolder: function () {
        var self = this;

        var payload = {
            displayName: self.config.systemFolder,
            parent: {
                objectType: "PROJECT",
                id: self.appId
            }
        };

        return $.ajax({
            url: self.apiBase + 'data/folder/',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(
                function (success) {
                    if (success.displayName != self.config.systemFolder)
                        throw new Error("Permissions issue. Folder " + self.config.systemFolder + " exists but is not accessible");
                    return success.id;
                },
                function (failed) {
                    throw new Error("Failed to create folder " + self.config.systemFolder + " with " + failed);
                }
            );
    },
    
    findOrCreateFolder: function() {
        var self=this;
        
        return self.findFolder()
        .then(function (found) {
            if (found) {
                self.folderId = found;
                return found;
            } else {
                // folder doesnt exist so create it
                return self.createFolder()
                    .then(function (created) {
                        self.folderId = created;
                        // return the id
                        return created;
                    })
                    // and set it to fully shared
                    .then(function () {
                        return self.shareFolder();
                    });
            }
        });
    },

    shareFolder: function () {
        var self = this;

        if (!self.folderId)
            throw new Error("Dashboard not initialized, missing folder id");

        var payload = {
            id: self.folderId,
            shareStatus: "FULLACCESS"
        };

        return $.ajax({
            url: self.apiBase + 'data/folder/' + self.folderId + "?cascadeShareStatus=false&cascadeOwner=false",
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(
                function (success) {
                    return success.id;
                },
                function (failed) {
                    throw new Error("Failed to set dashboard folder to fully shared with " + failed);
                }
            );
    },

    // find a scenario in a given folder
    findScenario: function () {
        var self = this;

        if (!self.userId)
            throw new Error("Dashboard not initialized, missing user id");
        if (!self.folderId)
            throw new Error("Dashboard not initialized, missing folder id");

        var scenarioName = self.config.viewId + "." + self.userId;

        return $.ajax({
            url: self.apiBase + 'data/folder/' + self.folderId + '/children',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8'
        })
            .then(
                function (response) {
                    var found = false;
                    $.each(response.items, function (i, v) {
                        if (scenarioName == v.displayName)
                            found = v.id;
                    });
                    return found;
                },
                function (failed) {
                    throw new Error("Failed to check for scenario " + scenarioName + " existance with " + failed);
                }
            );
    },

    // create a scenario in a given folder
    createScenario: function () {
        var self = this;

        var scenarioName = self.config.viewId + "." + self.userId;

        var payload = {
            displayName: scenarioName,
            parent: {
                objectType: "FOLDER",
                id: self.folderId
            }
        };

        return $.ajax({
            url: self.apiBase + 'data/scenario/',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(
                function (success) {
                    return success.id;
                },
                function (failed) {
                    throw new Error("Failed to create scenario " + scenarioName + " with " + failed);
                }
            );
    },

    // check if the scenario is loaded
    isScenarioLoaded: function () {
        var self = this;

        if (!self.scenarioId)
            throw new Error("Dashboard not initialized, missing scenario id");

        return $.ajax({
            url: self.apiBase + 'data/scenario/' + self.scenarioId,
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8'
        })
            .then(
                function (scenario) {
                    return scenario.loaded;
                },
                function (failed) {
                    throw new Error("Failed to check scenario " + self.scenarioId + " is loaded with " + failed);
                }
            );
    },

    // loads the dashboard scenario
    loadScenario: function () {
        var self = this;

        if (!self.scenarioId)
            throw new Error("Dashboard not initialized, missing scenario id");

        var payload = {
            id: self.scenarioId,
            objectType: "EXECUTION_REQUEST",
            jobType: self.config.executionMode
        };

        return $.ajax({
            url: self.apiBase + 'data/execution',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(
                function (success) {
                    return true;
                },
                function (failed) {
                    console.log(failed);
                    throw new Error("Failed to load scenario " + self.scenarioId + " with " + failed.message);
                }
            );
    },
    
    findOrCreateScenario: function(){
        var self=this;
        
        return self.findScenario()
            .then(function (found) {
                // found the scenario
                if (found) {
                    self.scenarioId = found;
                    return self.scenarioId;
                } else {
                    return self.createScenario()
                        .then(function (created) {
                            // return the id
                            self.scenarioId = created;
                            return self.scenarioId;
                        });
                }
            });
    },

    // test for executing
    isExecuting: function () {
        var self = this;

        if (!self.scenarioId)
            throw new Error("Dashboard not initialized, missing scenario id");

        return $.ajax({
            url: self.apiBase + 'data/scenario/' + self.scenarioId + '/job',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8'
        })
            .then(
                function () { // success
                    return true;
                },
                function () { // failure
                    return false;
                }
            );
    },
    
    ensureScenarioLoaded: function() {
        var self=this;
        
        return self.isScenarioLoaded()
            .then(function (loaded) {
                if (!loaded) {
                    // if the scenario is not loaded but is queued or executing already this will fail
                    self.loadScenario()
                        .then(function () {
                            // we know the scenario will be executing and to avoid any potential race condition we will
                            // show the overlay explicitly rather than test for execution status
                            self.doOverlay(true);
                        });
                }
                else {
                    // check if we need to put up the overlay for an already executing scenario
                    self.doOverlay();
                }
            });
    },

    showOverlay: function (show) {
        var self = this;

        if (show) {
            $(document).trigger("dashboard.overlay.show"); // this will show the overlay
            // and assume we will be current when we are finished
            self.current(true);
        }
        else
            $(document).trigger("dashboard.overlay.hide"); // this will hide the overlay
    },

    // check if scenario is already queued/executing
    doOverlay: function (force) {
        var self = this;
        
        if (force != undefined) {
            if (force)
                self.showOverlay(true);
            else
                self.showOverlay(false);
        }

        // start polling every interval
        self.polling = window.setInterval(function () {
                self.isExecuting()
                    .then(function (status) {
                        if (status) { // executing
                            self.showOverlay(true);
                        } else {
                            self.showOverlay(false);
                            window.clearInterval(self.polling);
                        }
                    });
            },
            1000 * self.config.executionPollingInterval
        );
    },

    dependencyModified: function (t) {
        var self = this;
        var payload = {
            timestamp: t,
            path: self.config.dependencyPath,
            exclusions: ["/" + self.config.systemFolder].concat(self.config.dependencyExclusions)
        };

        return $.ajax({
            url: self.apiBase + 'data/project/' + self.appId + '/dashboard/status',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.dataModifiedSinceTimestamp;
            });
    },

    getLastExecutionDate: function () {
        // needs to be a rest call as scenario selection not yet active
        var self = this;

        if (!self.scenarioId)
            throw new Error("Dashboard not initialized, missing scenario id");

        var payload = {}; // summary data only, no entities

        return $.ajax({
            url: self.apiBase + 'data/scenario/' + self.scenarioId + '/data',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.summary.lastExecutionDate;
            });
    },

    doDependencyChecking: function () {
        var self = this;

        // do an immediate check
        self.getLastExecutionDate()
            .then(function (lastModified) {
                return self.dependencyModified(lastModified);
            })
            .then(function (modified) {
                self.current(!modified);
            });

        // and start polling 
        window.setInterval(function () {
                self.getLastExecutionDate()
                    .then(function (lastModified) {
                        return self.dependencyModified(lastModified);
                    })
                    .then(function (modified) {
                        self.current(!modified);
                    });
            },
            1000 * self.config.dependencyPollingInterval
        );
    },

    start: function () {
        var self = this;
        
        // get the API base
        // use the resolution method if available, to be path based routing comptabile
        if (typeof insight.resolveRestEndpoint === "function")
            self.apiBase = insight.resolveRestEndpoint('/insightservices/rest/v1/');
        else
        // if the method doesnt exist, cant be using PBR so safe to assume default base
            self.apiBase = '/insightservices/rest/v1/';

        // get the user
        return insight.getView().getUser()
            .then(function (user) {
                self.userId = user.getUsername();
                return self.userId;
            })
            .then(self.findOrCreateFolder.bind(this))
            .then(self.findOrCreateScenario.bind(this))
            .then(self.ensureScenarioLoaded.bind(this))
            .then(function () {
                // if we are doing dependency checking then start the checking
                if (self.config.dependencyCheck)
                    self.doDependencyChecking();
                return [self.scenarioId];
            })

            // no dashboard scenario selected is our error state
            .catch(function (error) {
                insight.getView().showErrorMessage(error);
                return []; // select no scenario
            });
    },
    
    refresh: function(execMode) {
        return new Promise(function (resolve, reject) {
            insight.getView().withScenarios(0)
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
            return insight.getView().getScenarioProperties(0);
        })
        .then(function (props) {
            return props.execute(execMode, {
                suppressClearPrompt: true // we dont want the prompt for a refresh
            });
        })
        .then(function () {
            // show the custom overlay
            dashboard.doOverlay(true); /* global dashboard */
        })
        .catch(function (error) {
            var title = 'Failed to refresh the dashboard';
            var message;
            switch (error.status) {
                case 403:
                    message = 'Insufficient rights to execute the dashboard scenario.';
                    break;
                case 404:
                    message = 'Internal error. The scenario or execution mode "' +
                        execMode +
                        '" does not exist.';
                    break;
                case 423:
                    message = 'Internal error. The scenario is locked.';
                    break;
                default:
                    message = error.message;
                    break;
            }
            insight.getView().showErrorMessage(title + ": " + message);
            throw error;
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

    self.appId = insight.getView().getApp().getId();

    // integrate user provided config values
    $.extend(self.config, userconfig);

    // systemFolder must be in the root
    var regexp = /^[\/]*[\w\. ]+$/;
    if (!regexp.test(self.config.systemFolder ))
        throw new Error("Invalid system folder setting, must be a root folder");

    // dashboard uses custom overlay
    insight.getView().configure({
        executionOverlay: false
    });

    self.current = VDL.createVariable(true);

     /*
    Custom overlay the dashboard framework can control, including custom text
    Disables default overlay
    */
    VDL('dashboard-overlay', {
        tag: 'dashboard-overlay',
        isContainer: false,
        attributes: [],
        template: '<div data-bind="visible: $component.showLoadingOverlay" class="dashboard-loading-overlay"> ' +
            '    <img class="dashboard-loading-img" src="" width="109" height="109"/>                    ' +
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
};
