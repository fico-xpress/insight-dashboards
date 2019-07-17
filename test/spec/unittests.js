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
    beforeEach(function () {
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
                            }
                        };
                    },
                    getUser: function () {
                        return Promise.resolve({
                            getUsername: function () {
                                return 'USERID';
                            }
                        });
                    },
                    showErrorMessage () {}
                }
            }
        };
    });

    describe("findFolder()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it("should resolve to true if the system folder exists", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.findFolder()
                .then((found) => {
                    expect(found).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findFolder.someFolders);
            return promise;
        });

        it("should resolve to true if the custom system folder exists", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode',
                systemFolder: 'customfolder'
            });
            var promise = dashboard.findFolder()
                .then((found) => {
                    expect(found).toEqual('CUSTOMID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findFolder.someFolders);
            return promise;
        });

        it("should resolve to false if the system folder does not exist", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode',
                systemFolder: 'folderdoesntexist'
            });
            var promise = dashboard.findFolder()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findFolder.someFolders);
            return promise;
        });

        it("should resolve to false if no folders exist", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.findFolder()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findFolder.noFolders);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.findFolder()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("createFolder()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it("should return an id if it successfully creates a folder", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.createFolder()
                .then((id) => {
                    expect(id).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");
            var response = testResponses.createFolder.success;
            response.responseText = JSON.stringify({
                id: "FOLDERID",
                displayName: "_system"
            });
            request.respondWith(response);
            return promise;
        });

        it("should throw an error if it fails to create a folder", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.createFolder()
                .then((id) => {
                    // should not success!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");

            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("shareFolder()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.folderId = "FOLDERID";
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should fail if the system folder id isnt known", function () {
            this.dashboard.folderId = null;
            expect(this.dashboard.findScenario).toThrow();
        });

        it("should return an id if it successfully shares a folder", function () {
            var promise = this.dashboard.shareFolder()
                .then((id) => {
                    expect(id).toEqual(this.dashboard.folderId);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + this.dashboard.folderId + "?cascadeShareStatus=false&cascadeOwner=false");
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe(this.dashboard.folderId);
            expect(JSON.parse(request.params).shareStatus).toBe("FULLACCESS");
            request.respondWith(testResponses.shareFolder.success);
            return promise;
        });

        it("should throw an error if it fails to share the folder", function () {
            var promise = this.dashboard.shareFolder()
                .then((id) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + this.dashboard.folderId + "?cascadeShareStatus=false&cascadeOwner=false");
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe(this.dashboard.folderId);
            expect(JSON.parse(request.params).shareStatus).toBe("FULLACCESS");
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("findScenario()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.folderId = 'FOLDERID';
            this.dashboard.userId = 'USERID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should fail if the system folder id isnt known", function () {
            this.dashboard.folderId = null;
            expect(this.dashboard.findScenario).toThrow();
        });

        it("should fail if the user id isnt knownn", function () {
            this.dashboard.userId = null;
            expect(this.dashboard.findScenario).toThrow();
        });

        it("should resolve to true if the dashboard scenario exists", function () {
            var promise = this.dashboard.findScenario()
                .then((found) => {
                    expect(found).toEqual('SCENARIOID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + this.dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findScenario.someScenarios);
            return promise;
        });

        it("should resolve to false if the system folder does not exist", function () {
            var promise = this.dashboard.findScenario()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + this.dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findScenario.noScenarios);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var promise = this.dashboard.findScenario()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + this.dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("isScenarioLoaded()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.scenarioId = 'SCENARIOID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            this.dashboard.scenarioId = null;
            expect(this.dashboard.isScenarioLoaded).toThrow();
        });

        it("should resolve to true if the dashboard scenario is loaded", function () {
            var promise = this.dashboard.isScenarioLoaded()
                .then((loaded) => {
                    expect(loaded).toBe(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isScenarioLoaded.loaded);
            return promise;
        });

        it("should resolve to false if the dashboard scenario is not loaded", function () {
            var promise = this.dashboard.isScenarioLoaded()
                .then((loaded) => {
                    expect(loaded).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isScenarioLoaded.notLoaded);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var promise = this.dashboard.isScenarioLoaded()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("loadScenario()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.scenarioId = 'SCENARIOID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            this.dashboard.scenarioId = null;
            expect(this.dashboard.loadScenario).toThrow();
        });

        it("should resolve to true if the dashboard scenario is successfully submitted for execution", function () {
            var promise = this.dashboard.loadScenario()
                .then((success) => {
                    expect(success).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/execution');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe('SCENARIOID');
            expect(JSON.parse(request.params).jobType).toBe('test_executionMode');
            request.respondWith(testResponses.loadScenario.success);
            return promise;
        });

        it("should throw an error if the dashboard scenario is not successfully submitted for execution", function () {
            var promise = this.dashboard.loadScenario()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/execution');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe('SCENARIOID');
            expect(JSON.parse(request.params).jobType).toBe('test_executionMode');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("isExecuting()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.scenarioId = 'SCENARIOID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            this.dashboard.scenarioId = null;
            expect(this.dashboard.isExecuting).toThrow();
        });

        it("should resolve to true if the dashboard scenario is executing", function () {
            var promise = this.dashboard.isExecuting()
                .then((executing) => {
                    expect(executing).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId + '/job');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isExecuting.executing);
            return promise;
        });

        it("should resolve to false if the dashboard scenario is not executing", function () {
            var promise = this.dashboard.isExecuting()
                .then((executing) => {
                    expect(executing).toEqual(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId + '/job');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isExecuting.notExecuting);
            return promise;
        });
    });

    describe("doOverlay()", function () {
        beforeEach(function () {
            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            spyOn($.fn, "trigger");
            this.dashboard.current = function () {
            }; // stub for ko observable
        });

        afterEach(function () {
            this.dashboard = null;
        });

        it("should show the overlay when asked to show the overlay", function () {
            this.dashboard.showOverlay(true);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.show");
        });

        it("should show the overlay when asked to hide the overlay", function () {
            this.dashboard.showOverlay(false);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.hide");
        });
    });

    describe("dependencyModified()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode',
                dependencyPath: '/test_dependencyPath',
                dependencyExclusions: '/test_dependencyExclusion'
            });
            this.dashboard.scenarioId = 'SCENARIOID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should resolve to true if the server says something has changed since timestamp", function () {
            var timestamp = 1234;
            var promise = this.dashboard.dependencyModified(timestamp)
                .then((modified) => {
                    expect(modified).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + this.dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.dependencyModified.modified);
            return promise;
        });

        it("should resolve to false if the server says nothing has changed since timestamp", function () {
            var timestamp = 1234;
            var promise = this.dashboard.dependencyModified(timestamp)
                .then((modified) => {
                    expect(modified).toEqual(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + this.dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.dependencyModified.notModified);
            return promise;
        });

        it("should throw an error if the server does not return 200", function () {
            var timestamp = 1234;
            var promise = this.dashboard.dependencyModified(timestamp)
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + this.dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("getLastExecutionDate()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            this.dashboard.scenarioId = 'SCENARIOID';
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should throw an error if the dashboard scenario id isnt known", function () {
            this.dashboard.scenarioId = null;
            expect(this.dashboard.getLastExecutionDate).toThrow();
        });

        it("should return the last execution timestamp", function () {
            var promise = this.dashboard.getLastExecutionDate()
                .then((timestamp) => {
                    expect(timestamp).toEqual(123456789);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId + '/data');
            expect(request.method).toBe('POST');
            request.respondWith(testResponses.getLastExecutionDate.response);
            return promise;
        });

        it("should throw an error if the server does not return 200", function () {
            var promise = this.dashboard.getLastExecutionDate()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + this.dashboard.scenarioId + '/data');
            expect(request.method).toBe('POST');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("createFolder()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
        });

        it("should return an id if it successfully creates a folder", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.createFolder()
                .then((id) => {
                    expect(id).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");
            var response = testResponses.createFolder.success;
            response.responseText = JSON.stringify({
                id: "FOLDERID",
                displayName: "_system"
            });
            request.respondWith(response);
            return promise;
        });

        it("should throw an error if it fails to create a folder", function () {
            var dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
            var promise = dashboard.createFolder()
                .then((id) => {
                    // should not success!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");

            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("findOrCreateFolder()", function () {
        beforeEach(function () {
            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
        });

        afterEach(function () {
            this.dashboard = null;
        });

        it("should return an id if the folder already exists", function (done) {
            spyOn(this.dashboard, "findFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "createFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "shareFolder").and.returnValue(Promise.resolve("FOLDERID"));
            this.dashboard.findOrCreateFolder()
                .then((id) => {
                    expect(id).toBe("FOLDERID");
                    expect(this.dashboard.findFolder).toHaveBeenCalled();
                    expect(this.dashboard.createFolder).not.toHaveBeenCalled();
                    done();
                });
        });

        it("should return an id if the folder doesnt exist", function (done) {
            spyOn(this.dashboard, "findFolder").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "createFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "shareFolder").and.returnValue(Promise.resolve("FOLDERID"));
            this.dashboard.findOrCreateFolder()
                .then((id) => {
                    expect(id).toBe("FOLDERID");
                    expect(this.dashboard.findFolder).toHaveBeenCalled();
                    expect(this.dashboard.createFolder).toHaveBeenCalled();
                    done();
                });
        })
    });

    describe("findOrCreateScenario()", function () {
        beforeEach(function () {
            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
        });

        afterEach(function () {
            this.dashboard = null;
        });

        it("should return an id if the scenario already exists", function (done) {
            spyOn(this.dashboard, "findScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(this.dashboard, "createScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            this.dashboard.findOrCreateScenario()
                .then((id) => {
                    expect(id).toBe("SCENARIOID");
                    expect(this.dashboard.findScenario).toHaveBeenCalled();
                    expect(this.dashboard.createScenario).not.toHaveBeenCalled();
                    done();
                });
        });

        it("should return an id if the scenario doesnt exist", function (done) {
            spyOn(this.dashboard, "findScenario").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "createScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            this.dashboard.findOrCreateScenario()
                .then((id) => {
                    expect(id).toBe("SCENARIOID");
                    expect(this.dashboard.findScenario).toHaveBeenCalled();
                    expect(this.dashboard.createScenario).toHaveBeenCalled();
                    done();
                });
        })
    });

    describe("ensureScenarioLoaded()", function () {
        beforeEach(function () {
            this.dashboard = new Dashboard({
                viewId: 'test_view',
                executionMode: 'test_executionMode'
            });
        });

        afterEach(function () {
            this.dashboard = null;
        });

        it("should do nothing if the scenario is already loaded", function (done) {
            spyOn(this.dashboard, "isScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "loadScenario").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "doOverlay").and.returnValue(Promise.resolve(true));
            this.dashboard.ensureScenarioLoaded()
                .then(() => {
                    expect(this.dashboard.isScenarioLoaded).toHaveBeenCalled();
                    expect(this.dashboard.loadScenario).not.toHaveBeenCalled();
                    expect(this.dashboard.doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should load the scenario and force the overlay if the scenario is not already loaded", function (done) {
            spyOn(this.dashboard, "isScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "loadScenario").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "doOverlay").and.returnValue(Promise.resolve(true));
            this.dashboard.ensureScenarioLoaded()
                .then(() => {
                    expect(this.dashboard.isScenarioLoaded).toHaveBeenCalled();
                    expect(this.dashboard.loadScenario).toHaveBeenCalled();
                    expect(this.dashboard.doOverlay).toHaveBeenCalledWith(true);
                    done();
                });
        });
    });

    describe("constructor()", function () {
        beforeEach(function () {
            jasmine.Ajax.install();

            this.config = {
                viewId: 'test_view', // name of the dashboard view
                systemFolder: 'test_systemFolder', // location for the dashboard scenarios
                executionMode: 'test_executionMode', // custom load mode for running the dashboard scenairo
                executionPollingInterval: 100, // seconds between polls to see if the dashboard scenario has finished executing
                dependencyCheck: true, // should the dependency check be run automatically
                dependencyPollingInterval: 101, // seconds frequency for running the dependency check
                dependencyPath: '/test_dependencyPath', // repository path relative to the app that the dependency check starts from
                dependencyExclusions: ['test_dependencyExclusion'] // folders to exclude from the dependency check
            };
        });

        afterEach(function () {
            jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should apply user config settings", function () {
            var self = this;
            self.dashboard = new Dashboard(self.config);
            $.each(self.dashboard.config, function (key, value) {
                expect(self.dashboard.config[key]).toEqual(self.config[key]);
            });
        });

        it("should throw an error if the system folder is not a folder in the root", function () {
            var self = this;
            this.config.systemFolder = "folder/nested folder";
            expect(Dashboard.bind(self.dashboard, self.config)).toThrow();
        })
    });

    describe("start()", function () {
        beforeEach(function () {
            //jasmine.Ajax.install();

            this.config = {
                viewId: 'test_view', // name of the dashboard view
                executionMode: 'test_executionMode'
            };
            this.dashboard = new Dashboard(this.config);
        });

        afterEach(function () {
            //jasmine.Ajax.uninstall();
            this.dashboard = null;
        });

        it("should return the scenario id given the system folder and dashboard scenario already exist", function (done) {
            spyOn(this.dashboard, "findFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "createFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "shareFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "findScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(this.dashboard, "createScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(this.dashboard, "isScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "loadScenario").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "doOverlay").and.returnValue(true);

            this.dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(this.dashboard.findFolder).toHaveBeenCalled();
                    expect(this.dashboard.createFolder).not.toHaveBeenCalled();
                    expect(this.dashboard.shareFolder).not.toHaveBeenCalled();
                    expect(this.dashboard.findScenario).toHaveBeenCalled();
                    expect(this.dashboard.createScenario).not.toHaveBeenCalled();
                    expect(this.dashboard.isScenarioLoaded).toHaveBeenCalled();
                    expect(this.dashboard.loadScenario).not.toHaveBeenCalled();
                    expect(this.dashboard.doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should return the scenario id given the system folder exists and the dashboard scenario doesnt", function (done) {
            spyOn(this.dashboard, "findFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "createFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "shareFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "findScenario").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "createScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(this.dashboard, "isScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "loadScenario").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "doOverlay").and.returnValue(true);

            this.dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(this.dashboard.findFolder).toHaveBeenCalled();
                    expect(this.dashboard.createFolder).not.toHaveBeenCalled();
                    expect(this.dashboard.shareFolder).not.toHaveBeenCalled();
                    expect(this.dashboard.findScenario).toHaveBeenCalled();
                    expect(this.dashboard.createScenario).toHaveBeenCalled();
                    expect(this.dashboard.isScenarioLoaded).toHaveBeenCalled();
                    expect(this.dashboard.loadScenario).toHaveBeenCalled();
                    expect(this.dashboard.doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should return the scenario id given neither the system folder nor dashboard scenario exist", function (done) {
            spyOn(this.dashboard, "findFolder").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "createFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(this.dashboard, "shareFolder").and.returnValue("FOLDERID");
            spyOn(this.dashboard, "findScenario").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "createScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(this.dashboard, "isScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(this.dashboard, "loadScenario").and.returnValue(Promise.resolve(true));
            spyOn(this.dashboard, "doOverlay").and.returnValue(true);

            this.dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(this.dashboard.findFolder).toHaveBeenCalled();
                    expect(this.dashboard.createFolder).toHaveBeenCalled();
                    expect(this.dashboard.shareFolder).toHaveBeenCalled();
                    expect(this.dashboard.findScenario).toHaveBeenCalled();
                    expect(this.dashboard.createScenario).toHaveBeenCalled();
                    expect(this.dashboard.isScenarioLoaded).toHaveBeenCalled();
                    expect(this.dashboard.loadScenario).toHaveBeenCalled();
                    expect(this.dashboard.doOverlay).toHaveBeenCalled();
                    done();
                });
        });
    });
});
