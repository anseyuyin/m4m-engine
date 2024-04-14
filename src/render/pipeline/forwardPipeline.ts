/**
@license
Copyright (c) 2022 meta4d.me Authors

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
namespace m4m.render {
    /**
     * 前向渲染路径
     */
    export class forwardPipeline implements IRenderPipeLine {
        private _renderScene: framework.scene;
        private RealCameraNumber: number = 0;

        public render(scene: framework.scene) {
            if (scene == null) return;
            this._renderScene = scene;

            //排序camera 并绘制
            if (scene.renderCameras.length > 1) {
                scene.renderCameras.sort((a, b) => {
                    return a.order - b.order;
                });
            }

            this.RealCameraNumber = 0;
            let len = scene.renderCameras.length;
            //遍历相机 执行渲染
            for (let i = 0; i < len; i++) {
                render.glDrawPass.resetLastState();
                if (i == len - 1) {
                    scene.renderCameras[i].isLastCamera = true;
                }
                if (scene.app.beRendering) {
                    this.renderCamera(i);
                }
                scene.renderCameras[i].isLastCamera = false;
            }

            // scene.updateSceneOverLay(delta);
            this.rendererSceneOverLay();

            if (this.RealCameraNumber == 0 && scene.app && scene.app.beRendering) {
                scene.webgl.clearColor(0, 0, 0, 1);
                scene.webgl.clearDepth(1.0);
                scene.webgl.clear(scene.webgl.COLOR_BUFFER_BIT | scene.webgl.DEPTH_BUFFER_BIT);
                scene.webgl.flush();
            }

            if (framework.DrawCallInfo.BeActived) {
                framework.DrawCallInfo.inc.showPerFrame();
                framework.DrawCallInfo.inc.reset();
            }


            //清理
            this._renderScene = null;
        }

        /**
         * 渲染相机
         * 这个函数后面还有别的过程，应该留给camera
         * @param camindex 相机索引
         */
        private renderCamera(camindex: number) {
            let scene = this._renderScene;
            let app = scene.app;
            let assetmgr = app.getAssetMgr();
            //增加当前编辑器状态，管控场编相机
            //一个camera 不是一次单纯的绘制，camera 还有多个绘制遍
            let cam = scene.renderCameras[camindex];
            let context = scene.renderContext[camindex];
            context.fog = scene.fog;
            let needRender = false;
            let needRenderOverLay = false;
            if ((app.bePlay && !cam.isEditorCam) || (!app.bePlay && cam.isEditorCam)) {
                needRender = true;
                needRenderOverLay = true;
            }
            if (!app.bePlay && app.be2dstate && camindex == app.curcameraindex) {
                needRenderOverLay = true;
            }

            //渲染场景
            if (needRender) {
                this.RealCameraNumber++;
                context.updateCamera(app, cam);
                context.updateLights(scene.getRenderLights());
                cam.fillRenderer(scene);

                //阴影投射节点收集
                

                //深度纹理

                //渲染阴影

                //执行渲染场景
                cam.renderScene(scene, context, camindex);

            }

            //overlay 的渲染
            if (needRenderOverLay) {
                let overLays: framework.IOverLay[] = cam.getOverLays();
                for (let i = 0; i < overLays.length; i++) {
                    if (cam.CullingMask & framework.CullingMask.ui) {
                        overLays[i].render(context, assetmgr, cam);
                    }
                }
            }
        }

        /**
        * 渲染场景 2dUI overlay
        */
        private rendererSceneOverLay() {
            let scene = this._renderScene;
            let app = scene.app;
            let assetmgr = app.getAssetMgr();

            let ol2ds = scene.getScreenSpaceOverlays();
            if (!ol2ds || ol2ds.length < 1) return;

            let targetcamera = scene.mainCamera;
            if (!targetcamera) return;
            let rCams = scene.renderCameras;
            let mainCamIdx = rCams.indexOf(targetcamera);
            if (mainCamIdx == -1) {
                let cname = targetcamera.gameObject.getName();
                let oktag = false;
                for (let i = 0, l = rCams.length; i < l; i++) {
                    let cam = rCams[i];
                    if (cam && cam.gameObject.getName() == cname) {
                        targetcamera = scene.mainCamera = cam;
                        oktag = true;
                        break;
                    }
                }
                if (!oktag) {
                    scene.setMainCameraNull();
                    // scene._mainCamera = null;
                    targetcamera = scene.mainCamera;
                }
            }
            mainCamIdx = rCams.indexOf(targetcamera);
            if (!targetcamera) return;
            let len = ol2ds.length;
            for (let i = 0, l = len; i < l; ++i) {
                let overlay = ol2ds[i];
                if (overlay && app && app.beRendering) {
                    overlay.render(scene.renderContext[mainCamIdx], assetmgr, targetcamera);
                }
            }
        }

    }
}