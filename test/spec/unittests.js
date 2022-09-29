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

describe("Dashboard", function() {
    var dashboard;

    function initDashboardObject() {
        dashboard = new Dashboard({
            viewId: 'test_view',
            executionMode: 'test_executionMode',
            systemFolder: '_system',
            dependencyPath: '/test_dependencyPath',
            dependencyExclusions: '/test_dependencyExclusion'
        });
        dashboard.apiBase = "/insightservices/rest/v1/";
        dashboard.scenarioId = 'SCENARIOID';
        dashboard.folderId = 'FOLDERID';
        dashboard.userId = 'USERID';

        spyOn(dashboard.view, "showErrorMessage");
    }
    beforeEach(function () {
        jasmine.Ajax.install();


        // global stubs
        window.VDL = function () {
        };
        VDL.createVariable = function () {
        };

        window.insight = {
            getView: function () {
                return {
                    configure: function () {
                        return this;
                    },
                    getApp: function () {
                        return {
                            getId: function () {
                                return 'APPID';
                            },
                            createFolder: function () {},
                            createScenario: function () {}
                        };
                    },
                    showErrorMessage: function () {},
                    getUser: function () {}
                }
            },
            resolveRestEndpoint: jasmine.createSpy().and.callFake(_.identity),
            getVersion: function() { return { major: 4}}
        };


    });
    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    describe("apiVersion()", function () {
        beforeEach(function () {
            initDashboardObject();
        });
        it("Returns an API version of 1 for Insight 4", function () {
            spyOn(dashboard.api, "getVersion").and.returnValue(1);
            expect(dashboard.apiVersion()).toEqual(1);
        });
        it("Returns an API version of 2 for Insight 5", function () {
            spyOn(dashboard.api, "getVersion").and.returnValue(2);
            expect(dashboard.apiVersion()).toEqual(2);
        });
    })
    describe("start()", function () {
        beforeEach(function () {
            initDashboardObject();
        });
        it("should ensure there is a loaded dashboard scenario for the user", function (done) {
            spyOn(dashboard, "_getCurrentUser").and.returnValue(Promise.resolve("USERID"));
            spyOn(dashboard, "_findOrCreateSystemFolder").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_findOrCreateUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_ensureUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doDependencyChecking").and.returnValue(Promise.resolve(true));

            dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(dashboard._getCurrentUser).toHaveBeenCalled();
                    expect(dashboard._findOrCreateSystemFolder).toHaveBeenCalled();
                    expect(dashboard._findOrCreateUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._ensureUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._doDependencyChecking).not.toHaveBeenCalled();
                    done();
                });
        });
        it("should activate dependency checking if the config requests it", function (done) {
            spyOn(dashboard, "_getCurrentUser").and.returnValue(Promise.resolve("USERID"));
            spyOn(dashboard, "_findOrCreateSystemFolder").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_findOrCreateUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_ensureUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doDependencyChecking").and.returnValue(Promise.resolve(true));

            dashboard.config.dependencyCheck=true;
            dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(dashboard._getCurrentUser).toHaveBeenCalled();
                    expect(dashboard._findOrCreateSystemFolder).toHaveBeenCalled();
                    expect(dashboard._findOrCreateUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._ensureUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._doDependencyChecking).toHaveBeenCalled();
                    done();
                });
        });
        it("should show an error message if something goes wrong", function (done) {
            spyOn(dashboard, "_getCurrentUser").and.returnValue(Promise.resolve("USERID"));
            spyOn(dashboard, "_findOrCreateSystemFolder").and.returnValue(Promise.reject("SOMEERROR"));

            dashboard.start()
                .then((ids) => {
                    expect(ids).toEqual([]);
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("SOMEERROR");
                    done();
                });
        });
    });
    describe("constructor()", function () {
        var config = {
            viewId: 'test_view', // name of the dashboard view
            systemFolder: 'test_systemFolder', // location for the dashboard scenarios
            scenarioType: "SCENARIO", // optional custom type for the dashboard scenario
            executionMode: 'test_executionMode', // custom load mode for running the dashboard scenairo
            executionPollingInterval: 100, // seconds between polls to see if the dashboard scenario has finished executing
            dependencyCheck: true, // should the dependency check be run automatically
            dependencyPollingInterval: 101, // seconds frequency for running the dependency check
            dependencyPath: '/test_dependencyPath', // repository path relative to the app that the dependency check starts from
            dependencyExclusions: ['test_dependencyExclusion'] // folders to exclude from the dependency check
        };

        it("should apply user config settings", function () {
            var self = this;
            config.systemFolder = "test_systemFolder";
            var temp = new Dashboard(config);
            $.each(temp.config, function (key, value) {
                expect(temp.config[key]).toEqual(config[key]);
            });
        });

        it("should throw an error if the system folder is not a folder in the root", function () {
            var self = this;
            var temp;
            config.systemFolder = "folder/nested folder";
            expect(Dashboard.bind(temp, config)).toThrow();
        });
    });
    describe("_getCurrentUser", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the current user", function () {
            spyOn(dashboard.api, "getCurrentUser");
            dashboard._getCurrentUser();
             expect(dashboard.api.getCurrentUser).toHaveBeenCalled();
        });
    });
    describe("_findSystemFolder", function() {
        var folders = [
            { 'name' : 'folder1', 'id' : 'ID1'},
            { 'name' : '_system', 'id' : 'ID2'},
            { 'name' : 'folder2', 'id' : 'ID3'},
        ];

        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the system folder id if exists", function (done) {
            spyOn(dashboard.api, "getRootFolders").and.returnValue(Promise.resolve(folders));

            dashboard._findSystemFolder()
                .then((id) => {
                    expect(id).toBe('ID2');
                    done();
                });
        });
        it("should throw an error if it cant get the folder listing", function (done) {
            spyOn(dashboard.api, "getRootFolders").and.returnValue(Promise.reject("ANERROR"));

            dashboard._findSystemFolder()
                .then(done.fail)
                .catch(() => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to check for folder " + dashboard.config.systemFolder + " existance with ANERROR");
                    done();
                });
        });
    })
    describe("_createSystemFolder", function() {
        var folders = [
            { 'name' : 'folder1', 'id' : 'ID1'},
            { 'name' : '_system', 'id' : 'ID2'},
            { 'name' : 'folder2', 'id' : 'ID3'},
        ];

        beforeEach(function () {
            initDashboardObject();
        });

        it("should create the system folder and return its id", function (done) {
            spyOn(dashboard.api, "createRootFolder").and.returnValue(Promise.resolve(folders[1]));

            dashboard._createSystemFolder()
                .then((id) => {
                    expect(dashboard.api.createRootFolder).toHaveBeenCalledWith(dashboard.app, dashboard.config.systemFolder);
                    expect(id).toBe('ID2');
                    done();
                });
        });
        it("should show an error if it fails to create a folder", function (done) {
            spyOn(dashboard.api, "createRootFolder").and.returnValue(Promise.reject("ANERROR"));

            dashboard._createSystemFolder()
                .then(done.fail)
                .catch(() => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to create folder " + dashboard.config.systemFolder + " with ANERROR");
                    done();
                });
        });
        it("should show an error if the new system folder has the wrong name", function (done) {
            spyOn(dashboard.api, "createRootFolder").and.returnValue(Promise.resolve(folders[0])); // wrong folder name

            dashboard._createSystemFolder()
                .then(done.fail)
                .catch(() => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to create folder " + dashboard.config.systemFolder + " with Error: " + "Permissions issue. Folder " + dashboard.config.systemFolder + " exists but is not accessible");
                    done();
                });
        });
    })
    describe("_findOrCreateSystemFolder", function() {
        var folders = [
            {'name': 'folder1', 'id': 'ID1'},
            {'name': '_system', 'id': 'ID2'},
            {'name': 'folder2', 'id': 'ID3'},
        ];

        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the folder id if the system folder already exists", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));

            dashboard._findOrCreateSystemFolder()
                .then((id) => {
                    expect(id).toBe('FOLDERID');
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    done();
                });
        });
        it("should create the system folder if the folder doesnt already exist", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));

            dashboard._findOrCreateSystemFolder()
                .then((id) => {
                    expect(id).toBe('FOLDERID');
                    expect(dashboard._createSystemFolder).toHaveBeenCalled();
                    expect(dashboard._shareSystemFolder).toHaveBeenCalled();
                    done();
                });
        });
    });
    describe("_shareSystemFolder", function() {
        var folders = [
            {'name': 'folder1', 'id': 'ID1'},
            {'name': '_system', 'id': 'ID2'},
            {'name': 'folder2', 'id': 'ID3'},
        ];

        beforeEach(function () {
            initDashboardObject();
        });

        it("should set the system folder to full access", function(done) {
            spyOn(dashboard.api, "shareFolder").and.returnValue(Promise.resolve(folders[1]));

            dashboard._shareSystemFolder()
                .then(id => {
                    expect(id).toEqual(folders[1].id);
                    expect(dashboard.api.shareFolder).toHaveBeenCalledWith(dashboard.folderId, "FULLACCESS");
                    done();
                })
        });
        it("should show an error message if it cant set the share status", function(done) {
            spyOn(dashboard.api, "shareFolder").and.returnValue(Promise.reject("ANERROR"));

            dashboard._shareSystemFolder()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to set dashboard folder to fully shared with ANERROR");
                    done();
                })
        });

    });
    describe("_findUserDashboardScenario", function() {

        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the id of the users scenario if it exists", function (done) {
            var scenarioName = dashboard.config.viewId + "." + dashboard.userId;
            var scenarios = [
                {'name': 'scenario1', 'id': 'ID1'},
                {'name': 'scenario2', 'id': 'ID2'},
                {'name': 'scenario3', 'id': 'ID3'},
                {'name': scenarioName, 'id': 'ID4'}
            ];
            spyOn(dashboard.api, "getChildren").and.returnValue(Promise.resolve(scenarios));

            dashboard._findUserDashboardScenario()
                .then(id => {
                    expect(id).toEqual('ID4');
                    done();
                });
        })
        it("should return false if the users scenario does not exist", function (done) {
            var scenarios = [
                {'name': 'scenario1', 'id': 'ID1'},
                {'name': 'scenario2', 'id': 'ID2'},
                {'name': 'scenario3', 'id': 'ID3'},
            ];
            spyOn(dashboard.api, "getChildren").and.returnValue(Promise.resolve(scenarios));

            dashboard._findUserDashboardScenario()
                .then(id => {
                    expect(id).toBeFalsy();
                    done();
                });
        })
        it("should show an error message if it failed to get the list of scenarios", function (done) {
            var scenarioName = dashboard.config.viewId + "." + dashboard.userId;

            spyOn(dashboard.api, "getChildren").and.returnValue(Promise.reject("ANERROR"));

            dashboard._findUserDashboardScenario()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to check for scenario " + scenarioName + " existance with ANERROR");
                    done();
                });
        })
    });
    describe("_createUserDashboardScenario", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should create the users scenario and return the id", function (done) {
            var scenarioName = dashboard.config.viewId + "." + dashboard.userId;
            spyOn(dashboard.api, "createScenario").and.returnValue(Promise.resolve({id: 'ID1'}));

            dashboard._createUserDashboardScenario()
                .then(id => {
                    expect(id).toEqual('ID1');
                    expect(dashboard.api.createScenario).toHaveBeenCalledWith(dashboard.app, dashboard.folderId, scenarioName, dashboard.config.scenarioType);
                    done();
                });
        })
        it("should show an error message if it fails to create the scenario", function (done) {
            var scenarioName = dashboard.config.viewId + "." + dashboard.userId;
            spyOn(dashboard.api, "createScenario").and.returnValue(Promise.reject("ANERROR"));

            dashboard._createUserDashboardScenario()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to create scenario " + scenarioName + " with ANERROR");
                    done();
                });
        })
    });
    describe("_findOrCreateUserDashboardScenario", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the user scenario id if it exists", function (done) {
            spyOn(dashboard,"_findUserDashboardScenario").and.returnValue(Promise.resolve("ID1"));
            dashboard._findOrCreateUserDashboardScenario()
                .then(id => {
                    expect(id).toEqual("ID1");
                    done();
                });
        })
        it("should create the user scenario if it doesnt exist, and return the id", function (done) {
            spyOn(dashboard,"_findUserDashboardScenario").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("CREATED"));
            dashboard._findOrCreateUserDashboardScenario()
                .then(id => {
                    expect(id).toEqual("CREATED");
                    expect(dashboard.scenarioId).toEqual("CREATED");
                    done();
                });
        });
    });
    describe("_isUserDashboardScenarioLoaded", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the loaded status of the scenario", function (done) {
            spyOn(dashboard.api,"getScenario").and.returnValue(Promise.resolve({loaded: true}));
            dashboard._isUserDashboardScenarioLoaded()
                .then(loaded => {
                    expect(loaded).toBeTruthy();
                    done();
                });
        });
        it("should show an error message if it cant get the scenario status", function (done) {
            spyOn(dashboard.api,"getScenario").and.returnValue(Promise.reject("ANERROR"));
            dashboard._isUserDashboardScenarioLoaded()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to check scenario " + dashboard.scenarioId + " is loaded with ANERROR");
                    done();
                });
        });
    });
    describe("_loadUserDashboardScenario", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should execute the scenario in the configured mode and return true", function (done) {
            spyOn(dashboard.api,"executeScenario").and.returnValue(Promise.resolve({loaded: true}));
            dashboard._loadUserDashboardScenario()
                .then(returned => {
                    expect(returned).toBeTruthy();
                    expect(dashboard.api.executeScenario).toHaveBeenCalledWith(dashboard.scenarioId, dashboard.config.executionMode);
                    done();
                });
        });
        it("should show an error message if it cant get the scenario status", function (done) {
            spyOn(dashboard.api,"executeScenario").and.returnValue(Promise.reject("ANERROR"));
            dashboard._loadUserDashboardScenario()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to load scenario " + dashboard.scenarioId + " with ANERROR");
                    done();
                });
        });
        describe("_isUserDashboardScenarioExecuting", function() {
            beforeEach(function () {
                initDashboardObject();
            });

            it("should return true if the user scenario is executing (insight 4)", function (done) {
                spyOn(dashboard.api, "getVersion").and.returnValue(1); // insight 4 REST API v1
                spyOn(dashboard.api, "getJob").and.returnValue(Promise.resolve());
                dashboard._isUserDashboardScenarioExecuting()
                    .then(returned => {
                        expect(returned).toBeTruthy();
                        expect(dashboard.api.getJob).toHaveBeenCalledWith(dashboard.scenarioId);
                        done();
                    });
            });
            it("should return false if the user scenario is not executing (insight 4)", function (done) {
                spyOn(dashboard.api, "getVersion").and.returnValue(1); // insight 4 REST API v1
                spyOn(dashboard.api, "getJob").and.returnValue(Promise.reject());
                dashboard._isUserDashboardScenarioExecuting()
                    .then(returned => {
                        expect(returned).toBeFalsy();
                        expect(dashboard.api.getJob).toHaveBeenCalledWith(dashboard.scenarioId);
                        done();
                    });
            });
            it("should return true if the user scenario is executing (insight 5)", function (done) {
                var scenario = {
                    summary: {
                        reservedForJob: true
                    }
                }
                spyOn(dashboard.api, "getVersion").and.returnValue(2); // insight 4 REST API v1
                spyOn(dashboard.api, "getScenario").and.returnValue(Promise.resolve(scenario));
                dashboard._isUserDashboardScenarioExecuting()
                    .then(returned => {
                        expect(returned).toBeTruthy();
                        expect(dashboard.api.getScenario).toHaveBeenCalledWith(dashboard.scenarioId);
                        done();
                    });
            });
            it("should return false if the user scenario is not executing (insight 5)", function (done) {
                var scenario = {
                    summary: {
                        reservedForJob: false
                    }
                }
                spyOn(dashboard.api, "getVersion").and.returnValue(2); // insight 4 REST API v1
                spyOn(dashboard.api, "getScenario").and.returnValue(Promise.resolve(scenario));
                dashboard._isUserDashboardScenarioExecuting()
                    .then(returned => {
                        expect(returned).toBeFalsy();
                        expect(dashboard.api.getScenario).toHaveBeenCalledWith(dashboard.scenarioId);
                        done();
                    });
            });
        });
        describe("_ensureUserDashboardScenarioLoaded", function() {
            beforeEach(function () {
                initDashboardObject();
            });

            it("should load the user scenario if its not already loading, and show the overlay", function (done) {
                spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(false));
                spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve());
                spyOn(dashboard, "_doOverlay");
                dashboard._ensureUserDashboardScenarioLoaded()
                    .then(() => {
                        expect(dashboard._loadUserDashboardScenario).toHaveBeenCalled();
                        expect(dashboard._doOverlay).toHaveBeenCalledWith(true);
                        done();
                    });
            });
            it("should check if the overlay needs showing, if the user scenario is already loaded", function (done) {
                spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(true));
                spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve());
                spyOn(dashboard, "_doOverlay");
                dashboard._ensureUserDashboardScenarioLoaded()
                    .then(() => {
                        expect(dashboard._loadUserDashboardScenario).not.toHaveBeenCalled();
                        expect(dashboard._doOverlay).toHaveBeenCalled();
                        done();
                    });
            });
        });
    });
    describe("_showOverlay", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should show the overlay if passed the value true", function () {
            spyOn($.fn, "trigger");
            dashboard._showOverlay(true);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.show");
        });
        it("should hide the overlay if not passed the value true", function () {
            spyOn($.fn, "trigger");
            dashboard._showOverlay(false);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.hide");
        });
        describe("_doOverlay", function() {
            beforeEach(function () {
                initDashboardObject();
            });

            it("should show the overlay if force=true", function () {
                spyOn(dashboard, "_showOverlay");
                spyOn(window, "setInterval");
                dashboard._doOverlay(true);
                expect(dashboard._showOverlay).toHaveBeenCalledWith(true);
                expect(window.setInterval).toHaveBeenCalled();
            });
            it("should hide the overlay if force=false", function () {
                spyOn(dashboard, "_showOverlay");
                spyOn(window, "setInterval");
                dashboard._doOverlay(false);
                expect(dashboard._showOverlay).toHaveBeenCalledWith(false);
                expect(window.setInterval).toHaveBeenCalled();
            });
            it("should not force the overlay if force argument not provided", function () {
                spyOn(dashboard, "_showOverlay");
                spyOn(window, "setInterval");
                dashboard._doOverlay();
                expect(dashboard._showOverlay).not.toHaveBeenCalled();
                expect(window.setInterval).toHaveBeenCalled();
            });
        });
        describe("_updateOverlay", function() {
            beforeEach(function () {
                initDashboardObject();
            });

            it("should check if the scenario is executing and show the overlay if it is", function (done) {
                spyOn(dashboard, "_isUserDashboardScenarioExecuting").and.returnValue(Promise.resolve(true));
                spyOn(dashboard, "_showOverlay");
                dashboard._updateOverlay()
                    .then(() => {
                        expect(dashboard._showOverlay).toHaveBeenCalledWith(true);
                        done();
                    });
            });
            it("should check if the scenario is executing and hide the overlay if it isnt", function (done) {
                spyOn(dashboard, "_isUserDashboardScenarioExecuting").and.returnValue(Promise.resolve(false));
                spyOn(dashboard, "_showOverlay");
                dashboard._updateOverlay()
                    .then(() => {
                        expect(dashboard._showOverlay).toHaveBeenCalledWith(false);
                        done();
                    });
            });
        });
    });
    describe("_dependencyModified", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should resolve to whether the the dependencies of the dashboard have been modified", function (done) {
            spyOn(dashboard.api, "getDashboardStatus").and.returnValue(Promise.resolve());
            var exclusions = ["/" + dashboard.config.systemFolder].concat(dashboard.config.dependencyExclusions);

            dashboard._dependencyModified(999)
                .then(() => {
                    expect(dashboard.api.getDashboardStatus).toHaveBeenCalledWith(dashboard.appId, 999, dashboard.config.dependencyPath, exclusions);
                    done();
                });
        });
    });
    describe("_getLastExecutionDate", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the last execution timestamp of the user scenario", function (done) {
            var summary = {
                lastExecutionDate: 999
            }
            spyOn(dashboard.api, "getScenarioSummaryData").and.returnValue(Promise.resolve(summary));

            dashboard._getLastExecutionDate()
                .then(timestamp => {
                    expect(timestamp).toEqual(summary.lastExecutionDate);
                    done();
                });
        });
        it("should show an error message if the summary information cannot be fetched", function (done) {
            spyOn(dashboard.api, "getScenarioSummaryData").and.returnValue(Promise.reject("ANERROR"));

            dashboard._getLastExecutionDate()
                .then(done.fail)
                .catch(err => {
                    expect(dashboard.view.showErrorMessage).toHaveBeenCalledWith("Failed to get scenario summnary data " + dashboard.scenarioId + " with ANERROR");
                        done();
                })
        });
    });
    describe("_doDependencyChecking", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should start polling for dependencies being modified", function (done) {
            spyOn(dashboard, "_dependencyCheck").and.returnValue(Promise.resolve());
            spyOn(window, "setInterval");

            dashboard.current(true);
            dashboard._doDependencyChecking()
                .then(() => {
                    expect(window.setInterval).toHaveBeenCalled();
                    done();
                });
        });
    });
    describe("_dependencyCheck", function() {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should set the dashboard to not current if the  check shows the dependencies have been modified", function (done) {
            spyOn(dashboard, "_getLastExecutionDate").and.returnValue(Promise.resolve(999));
            spyOn(dashboard, "_dependencyModified").and.returnValue(Promise.resolve(true));

            dashboard.current(true);
            dashboard._dependencyCheck()
                .then(() => {
                    expect(dashboard._dependencyModified).toHaveBeenCalledWith(999);
                    expect(dashboard.current()).toEqual(false);
                    done();
                });
        });
        it("should set the dashboard to current if the  check shows the dependencies have not been modified", function (done) {
            spyOn(dashboard, "_getLastExecutionDate").and.returnValue(Promise.resolve(999));
            spyOn(dashboard, "_dependencyModified").and.returnValue(Promise.resolve(false));
            spyOn(window, "setInterval");

            dashboard.current(true);
            dashboard._dependencyCheck()
                .then(() => {
                    expect(dashboard._dependencyModified).toHaveBeenCalledWith(999);
                    expect(dashboard.current()).toEqual(true);
                    done();
                });
        });
    });

    ////// InsightRESTAPI v1
    describe('InsightRESTAPIv1 tests', function () {
        beforeEach(function () {
            spyOn(insight, "getVersion").and.returnValue({major: 4});
        });
        describe('InsightRESTAPIv1.getVersion()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should return the version which should always be 1", function () {
                expect(dashboard.api.getVersion()).toEqual(1);
            });
        });
        describe('InsightRESTAPIv1.getCurrentUser()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should return the object for the current user", function (done) {
                var response = {
                    'some' : 'thing'
                }
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(response));
                dashboard.api.getCurrentUser()
                    .then(user => {
                        expect(user).toEqual(response);
                        done();
                    })
            });
        });
        describe('InsightRESTAPIv1.restRequest()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var path = "/testpath";
            var type = "POST";
            var data = "1234";
            var responseText = {result: 100};
            var successResponse = {
                status: 200,
                responseText: JSON.stringify(responseText)
            };
            var failureResponse = {
                status: 500
            };

            it("Should return the response as a resolved promise when request is successful", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(successResponse);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response.result).toBe(100);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should return the response as a rejected promise when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(failureResponse);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("error");
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.getRootFolders()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var children = {
                items:
                    [
                        {objectType: "FOLDER", displayName: "C"},
                        {objectType: "SCENARIO", displayName: "XXX"},
                        {objectType: "FOLDER", displayName: "c"},
                        {objectType: "FOLDER", displayName: "a"},
                        {objectType: "FOLDER", displayName: "b"}
                    ]
            };
            var folders = [
                {objectType: "FOLDER", name: "a"},
                {objectType: "FOLDER", name: "b"},
                {objectType: "FOLDER", name: "C"},
                {objectType: "FOLDER", name: "c"},
            ];

            it("Should return a sorted list of root folders", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(children));

                dashboard.api.getRootFolders(dashboard.appId)
                    .then(function (response) {
                        expect(response).toEqual(folders);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.getChildren()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var data = {
                items:
                    [
                        {objectType: "FOLDER", displayName: "C"},
                        {objectType: "SCENARIO", displayName: "XXX"},
                        {objectType: "FOLDER", displayName: "c"},
                        {objectType: "FOLDER", displayName: "a"},
                        {objectType: "FOLDER", displayName: "_D"},
                        {objectType: "FOLDER", displayName: "b"}
                    ]
            };

            it("Should return a sorted, filtered list of projects", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                dashboard.api.getChildren(dashboard.appId)
                    .then(function (response) {
                        var children = _.cloneDeep(data.items);
                        for (var i = 0; i < children.length; i++) {
                            children[i].name = children[i].displayName;
                            delete children[i].displayName;
                        }
                        expect(response).toEqual(children);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.createScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var newScenario = {
                displayname: "New",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                id: "1234"
            };
            var parent = {
                objectType: "FOLDER",
                id: "5678"
            };
            var desiredType = "PROJECT";
            var desiredName = "New";

            it("Should call app.createScenario and normalize the name field", function (done) {
                spyOn(dashboard.app, "createScenario").and.returnValue(Promise.resolve(_.cloneDeep(newScenario)));
                dashboard.api.createScenario(dashboard.app, parent.id, desiredName, desiredType)
                    .then(function (response) {
                        expect(dashboard.app.createScenario).toHaveBeenCalledWith(parent, desiredName, desiredType);
                        var scenario = _.cloneDeep(newScenario);
                        scenario.name = scenario.displayName;
                        delete scenario.displayName;
                        expect(response).toEqual(scenario);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.createRootFolder()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var newFolder = {
                displayName: "new project",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should call app.CreateFolder to create a folder in the root", function (done) {
                spyOn(dashboard.app, "createFolder").and.returnValue(Promise.resolve(_.cloneDeep(newFolder)));
                dashboard.api.createRootFolder(dashboard.app, newFolder.displayName)
                    .then(function (response) {
                        var folder = _.cloneDeep(newFolder);
                        folder.name = folder.displayName;
                        delete folder.displayName;
                        expect(dashboard.app.createFolder).toHaveBeenCalledWith(newFolder.displayName);
                        expect(response).toEqual(folder);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPIv1.shareFolder()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var id = "1234";
            var shareStatus = "READONLY";

            it("Should POST to /folder to rename the folder", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.shareFolder(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith("folder/" + id, "POST", JSON.stringify(expectedPayload));
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.shareFolder(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        expect(dashboard.api.restRequest).not.toHaveBeenCalled();
                        done();
                    });
            });
        });
        describe('InsightRESTAPIv1.getScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var scenario = {
                displayname: "New",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                id: "1234"
            };

            it("Should get the scenario resource and normalize the name field", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(scenario)));
                dashboard.api.getScenario(666)
                    .then(function (scenario) {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('scenario/666', 'GET');
                        var normalized = _.cloneDeep(scenario);
                        normalized.name = normalized.displayName;
                        delete normalized.displayName;
                        expect(normalized).toEqual(scenario);
                        done();
                    })
            });
        });
        describe('InsightRESTAPIv1.getScenarioSummaryData()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var data = {
                summary: { some: "attributes"}
            };

            it("Should get the scenario summary data", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(data));
                dashboard.api.getScenarioSummaryData(666)
                    .then(function (summary) {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('scenario/666/data', 'POST', JSON.stringify({}));
                        expect(summary).toEqual(data.summary);
                        done();
                    })
            });
        });
        describe('InsightRESTAPIv1.executeScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            it("Should request execution with the desired mode", function (done) {
                var payload = {
                    id: 666,
                    objectType: "EXECUTION_REQUEST",
                    jobType: "THEMODE"
                };

                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.executeScenario(payload.id, payload.jobType)
                    .then(function () {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('execution', 'POST', JSON.stringify(payload));
                        done();
                    })
            });
        });
        describe('InsightRESTAPIv1.getJob()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            it("Should fetch the job for the scenario", function (done) {
                var response = {
                    summary: { 'some' : 'fields'}
                }

                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(response));
                dashboard.api.getJob(666)
                    .then(function (summary) {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('scenario/666/job', 'GET');
                        expect(summary).toEqual(response.summary);
                        done();
                    })
            });
        });
        describe('InsightRESTAPIv1.getDashboardStatus()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            it("Should fetch the dashboard status for the app", function (done) {
                var payload = {
                    timestamp: 1234,
                    path: "THEPATH",
                    exclusions: ['AAA','BBB']
                };
                var response = {
                    dataModifiedSinceTimestamp: true
                }

                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(response));
                dashboard.api.getDashboardStatus(666, payload.timestamp, payload.path, payload.exclusions)
                    .then(function (modified) {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('project/666/dashboard/status', 'POST', JSON.stringify(payload));
                        expect(modified).toEqual(response.dataModifiedSinceTimestamp);
                        done();
                    })
            });
        });
    });

    ////// InsightRESTAPI
    describe('InsightRESTAPI tests', function () {
        beforeEach(function () {
            spyOn(insight, "getVersion").and.returnValue({major: 5});
        });
        describe('InsightRESTAPI.getVersion()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should return the version which should be 2", function () {
                expect(dashboard.api.getVersion()).toEqual(2);
            });
        });
        describe('InsightRESTAPI.getCurrentUser()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should return the object for the current user", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.getCurrentUser()
                    .then(user => {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('authentication/current-user', 'GET');
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.restRequest()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var path = "/testpath";
            var type = "POST";
            var data = "1234";
            var responseText = {result: 100};
            var successResponse = {
                status: 200,
                responseText: JSON.stringify(responseText)
            };
            var failureResponseOuter = {
                status: 401,
                responseText: JSON.stringify({
                    error: {
                        code: 123,
                        message: "an outer error"
                    }
                })
            };
            var failureResponseInner = {
                status: 401,
                responseText: JSON.stringify({
                    error: {
                        code: 123,
                        message: "an outer error",
                        innerError: {
                            code: 456,
                            message: "an inner error"
                        }
                    }
                })
            };
            var emptyFailureResponse = {
                status: 500
            };
            var emptySuccessResponse = {
                status: 204
            };

            it("Should resolve to the response result when request is successful", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(successResponse);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response.result).toBe(100);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should resolve to empty promise when request is successful and no response body", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(emptySuccessResponse);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        done();
                    })
                    .catch(done.fail);
            });
            it("Should reject to 'error' when request fails and no response body", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(emptyFailureResponse);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("error");
                        done();
                    });
            });
            it("Should reject to outer error if there is no inner error when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(failureResponseOuter);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("an outer error");
                        done();
                    });
            });
            it("Should reject to inner error if there is an inner error when request is unsuccessful", function (done) {
                jasmine.Ajax.stubRequest(dashboard.api.BASE_REST_ENDPOINT + path).andReturn(failureResponseInner);
                dashboard.api.restRequest(path, type, data)
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (response) {
                        expect(jasmine.Ajax.requests.mostRecent().url).toBe(dashboard.api.BASE_REST_ENDPOINT + path);
                        expect(jasmine.Ajax.requests.mostRecent().method).toBe(type);
                        expect(jasmine.Ajax.requests.mostRecent().params).toBe(data);
                        expect(response).toBe("an inner error");
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.getRootFolders()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var children = {
                content:
                    [
                        {objectType: "FOLDER", name: "C"},
                        {objectType: "SCENARIO", name: "XXX"},
                        {objectType: "FOLDER", name: "c"},
                        {objectType: "FOLDER", name: "a"},
                        {objectType: "FOLDER", name: "b"}
                    ]
            };
            var folders = [
                {objectType: "FOLDER", name: "a"},
                {objectType: "FOLDER", name: "b"},
                {objectType: "FOLDER", name: "C"},
                {objectType: "FOLDER", name: "c"},
            ];

            it("Should return a sorted list of folders", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(children));
                dashboard.api.getRootFolders(dashboard.appId)
                    .then(function (response) {
                        expect(response).toEqual(folders);
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.getChildren()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var data = {
                content:
                    [
                        {objectType: "FOLDER", name: "C"},
                        {objectType: "SCENARIO", name: "XXX"},
                        {objectType: "FOLDER", name: "c"},
                        {objectType: "FOLDER", name: "a"},
                        {objectType: "FOLDER", name: "_D"},
                        {objectType: "FOLDER", name: "b"}
                    ]
            };

            it("Should return a list of children in the root of the app ", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(_.cloneDeep(data)));
                dashboard.api.getChildren(dashboard.appId)
                    .then(function (response) {
                        expect(response).toEqual(data.content);
                        done();
                    })
                    .catch(function (error) {
                        fail();
                    });
            });
        });
        describe('InsightRESTAPI.createScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var newScenario = {
                displayname: "New",
                objectType: "SCENARIO",
                scenarioType: "PROJECT",
                id: "1234"
            };
            var parent = {
                objectType: "FOLDER",
                id: "5678"
            };
            var desiredType = "PROJECT";
            var desiredName = "New";

            it("Should call app.createScenario and normalize the name field", function (done) {
                spyOn(dashboard.app, "createScenario").and.returnValue(Promise.resolve(_.cloneDeep(newScenario)));
                dashboard.api.createScenario(dashboard.app, parent.id, desiredName, desiredType)
                    .then(function (response) {
                        expect(dashboard.app.createScenario).toHaveBeenCalledWith(parent, desiredName, desiredType);
                        var scenario = _.cloneDeep(newScenario);
                        scenario.name = scenario.displayName;
                        delete scenario.displayName;
                        expect(response).toEqual(scenario);
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.createRootFolder()', function () {
            beforeEach(function () {
                initDashboardObject();
            });


            var newFolder = {
                displayName: "new project",
                id: "5678",
                objectType: "FOLDER",
                url: "blah"
            };

            it("Should call app.CreateFolder to create a folder in the root", function (done) {
                spyOn(dashboard.app, "createFolder").and.returnValue(Promise.resolve(_.cloneDeep(newFolder)));
                dashboard.api.createRootFolder(dashboard.app, newFolder.displayName)
                    .then(function (response) {
                        var folder = _.cloneDeep(newFolder);
                        folder.name = folder.displayName;
                        delete folder.displayName;
                        expect(dashboard.app.createFolder).toHaveBeenCalledWith(newFolder.displayName);
                        expect(response).toEqual(folder);
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.shareFolder()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var id = "1234";
            var shareStatus = "READONLY";

            it("Should PATCH to /folders to rename the scenario", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.shareFolder(id, shareStatus)
                    .then(function (response) {
                        var expectedPayload = {
                            id: id,
                            shareStatus: shareStatus
                        };
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith("folders/" + id, "PATCH", JSON.stringify(expectedPayload));
                        done();
                    })
            });
            it("Should reject an invalid share status", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.shareFolder(id, "invalid share status")
                    .then(function (response) {
                        fail();
                    })
                    .catch(function (error) {
                        expect(dashboard.api.restRequest).not.toHaveBeenCalled();
                        done();
                    });
            });
        });
        describe('InsightRESTAPI.getScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should return the object for the scenario", function (done) {
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.getScenario(666)
                    .then(() => {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('scenarios/666', 'GET');
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.getScenarioSummaryData()', function () {
            beforeEach(function () {
                initDashboardObject();
            });

            var data = {
                summary: { some: "attributes"}
            };

            it("Should return the summary data for the scenario", function (done) {
                debugger;
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(data));
                dashboard.api.getScenarioSummaryData(666)
                    .then(summary => {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('scenarios/666/data', 'POST',JSON.stringify({}));
                        expect(summary).toEqual(data.summary);
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.executeScenario()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should request execution for the scenario in the specified mode", function (done) {
                var payload = {
                    executionMode: "THEMODE",
                    scenario: {
                        id: 1234
                    }
                };
                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve());
                dashboard.api.executeScenario(payload.scenario.id, payload.executionMode)
                    .then(() => {
                        expect(dashboard.api.restRequest).toHaveBeenCalledWith('jobs', 'POST',JSON.stringify(payload));
                        done();
                    })
            });
        });
        describe('InsightRESTAPI.getDashboardStatus()', function () {
            beforeEach(function () {
                initDashboardObject();
            });
            it("Should request the dashboard status for the app", function (done) {
                var payload = {
                    timestamp: 1234,
                    path: "THEPATH",
                    exclusions: ["AAA", "BBB"]
                };

                var response = {
                    dataModifiedSinceTimestamp: false
                }

                spyOn(dashboard.api, "restRequest").and.returnValue(Promise.resolve(response));
                dashboard.api.getDashboardStatus(666, payload.timestamp, payload.path, payload.exclusions)
                    .then(modified => {

                        // TODO this method isnt implemented yet in the interface
                        //expect(dashboard.api.restRequest).toHaveBeenCalledWith('project/666/dashboard/status', 'POST', JSON.stringify(payload));
                        expect(modified).toEqual(response.dataModifiedSinceTimestamp);
                        done();
                    })
            });
        });

    });
});



