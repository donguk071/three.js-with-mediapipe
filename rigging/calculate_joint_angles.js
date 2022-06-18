// source is from https://github.com/TemugeB/joint_angles_calculate 

import {
	Quaternion,
	Vector2,
	Vector3,
    Matrix3,
    Matrix4,
    PerspectiveCamera,
    OrthographicCamera,
    Skeleton
} from 'three';

class ThreeMpPose {
    numSrcLandmarks = function() {return Object.keys(this.index_to_name).length;}
    pose3dDict = {}
    newJoints3D = {}
    mpHierarchy = {}

    constructor() {
        this.name_to_index = {
            'nose' : 0, 'left_eye_inner' : 1, 'left_eye' : 2, 'left_eye_outer' : 3, 
            'right_eye_inner' : 4, 'right_eye' : 5, 'right_eye_outer' : 6, 
            'left_ear' : 7, 'right_ear' : 8, 'mouse_left' : 9, 'mouse_right' : 10,
            'left_shoulder' : 11, 'right_shoulder' : 12, 'left_elbow' : 13, 'right_elbow' : 14,
            'left_wrist' : 15, 'right_wrist' : 16, 'left_pinky' : 17, 'right_pinky' : 18, 
            'left_index' : 19, 'right_index' : 20, 'left_thumb' : 21, 'right_thumb' : 22, 
            'left_hip' : 23, 'right_hip' : 24, 'left_knee' : 25, 'right_knee' : 26,  
            'left_ankle' : 27, 'right_ankle' : 28, 'left_heel' : 29, 'right_heel' : 30, 
            'left_foot_index' : 31, 'right_foot_index' : 32
        }
        this.index_to_name = {} 
        for (const [key, value] of Object.entries(this.name_to_index)) {
            //console.log(key, value);
            this.index_to_name[value] = key;
        }
    }

    updateMpLandmarks = function( mediapipeJoints ) {
        this.srcJoints = mediapipeJoints;
        let pose_landmarks_dict = {};
        mediapipeJoints.forEach((landmark, i) => {
            //console.log(i, landmark);
            //console.log(index_to_name[i]);
            pose_landmarks_dict[this.index_to_name[i]] = landmark;
        });
        this.poseLandmarks = pose_landmarks_dict;
    }

    add3dJointsForMixamo = function () {
        const center_hips = new Vector3().addVectors(this.pose3dDict["left_hip"], this.pose3dDict["right_hip"]);
        center_hips.multiplyScalar(0.5);

        const mp_left_shoulder = this.pose3dDict["left_shoulder"];
        const mp_right_shoulder = this.pose3dDict["right_shoulder"];
        const center_shoulders = new Vector3().addVectors(mp_left_shoulder, mp_right_shoulder);
        center_shoulders.multiplyScalar(0.5);

        const center_ear = new Vector3().addVectors(this.pose3dDict["left_ear"], this.pose3dDict["right_ear"]);
        center_ear.multiplyScalar(0.5);

        const dir_spine = new Vector3().subVectors(center_shoulders, center_hips);
        const dir_shoulders = new Vector3().subVectors(mp_right_shoulder, mp_left_shoulder);
        const length_spine = dir_spine.length();
        const length_shoulder = dir_shoulders.length();
        dir_spine.normalize();
        
        this.newJoints3D["hips"] = new Vector3().addVectors(center_hips, dir_spine.clone().multiplyScalar(length_spine / 9.0));
        this.newJoints3D["spine0"] = new Vector3().addVectors(center_hips, dir_spine.clone().multiplyScalar(length_spine / 9.0 * 3));
        this.newJoints3D["spine1"] = new Vector3().addVectors(center_hips, dir_spine.clone().multiplyScalar(length_spine / 9.0 * 5));
        this.newJoints3D["spine2"] = new Vector3().addVectors(center_hips, dir_spine.clone().multiplyScalar(length_spine / 9.0 * 7));
        const neck = new Vector3().addVectors(center_shoulders, dir_spine.clone().multiplyScalar(length_spine / 9.0));
        this.newJoints3D["neck"] = neck;
        this.newJoints3D["shoulder_left"] = new Vector3().addVectors(mp_left_shoulder, dir_shoulders.clone().multiplyScalar(1 / 3.0));
        this.newJoints3D["shoulder_right"] = new Vector3().addVectors(mp_left_shoulder, dir_shoulders.clone().multiplyScalar(2 / 3.0));

        const dir_head = new Vector3().subVectors(center_ear, neck);
        this.newJoints3D["head"] = new Vector3().addVectors(neck, dir_head.clone().multiplyScalar(0.5));

        for(const [key, value] of Object.entries(this.newJoints3D)) {
            this.pose3dDict[key] = value;    
        }
    }

    transformToWorld = function(camera, dist_from_cam, offset) {
        // if(camera.isPerspectiveCamera)
        // if the camera is orthogonal, set scale to 1
        const ip_lt = new Vector3(-1, 1, -1).unproject(camera);
        const ip_rb = new Vector3(1, -1, -1).unproject(camera);
        const ip_diff = new Vector3().subVectors(ip_rb, ip_lt);
        const x_scale = Math.abs(ip_diff.x);
        
        function ProjScale(p_ms, cam_pos, src_d, dst_d) {
            let vec_cam2p = new Vector3().subVectors(p_ms, cam_pos);
            return new Vector3().addVectors(cam_pos, vec_cam2p.multiplyScalar(dst_d/src_d));
        }

        this.pose3dDict = {};
        for (const [key, value] of Object.entries(this.poseLandmarks)) {
            //console.log(key, value);
            let p_3d = new Vector3((value.x - 0.5) * 2.0, -(value.y - 0.5) * 2.0, 0).unproject(camera);
            p_3d.z = -value.z * x_scale;

            p_3d = camera.isPerspectiveCamera ? ProjScale(p_3d, camera.position, camera.near, dist_from_cam) : p_3d.z += dist_from_cam;
            this.pose3dDict[key] = p_3d.add(offset);
        }
        //let p_ms = new THREE.Vector3((p.x - 0.5) * 2.0, -(p.y - 0.5) * 2.0, 0).unproject(camera_ar);
        //p_ms.z = -p.z * x_scale;
    }

    rigSolverForMixamo = function (skeleton) {
        this.computeR_hips = function(){
            const hip_joint = this.pose3dDict["hips"];
            let u = new Vector3().subVectors(this.pose3dDict["left_hip"], this.pose3dDict["right_hip"]).normalize();
            const v = new Vector3().subVectors(this.pose3dDict["neck"], hip_joint).normalize();
            const w = new Vector3().crossVectors(u, v).normalize();
            u = new Vector3().crossVectors(v, w).normalize();
            const R = new Matrix4().makeBasis(u, v, w); // local!!
            return R;
        }

        const R_hips = this.computeR_hips();
        const hip_root = skeleton.getBoneByName("mixamorigHips");
        const hip_joint = this.pose3dDict["hips"];
        //console.log(hip_root.parent.position);
        //console.log(hip_root.position);
        hip_root.position.set(0, 0, 0);
        //const character_scale = hip_root.parent.scale;
        //hip_root.position.set(hip_joint.x / character_scale.x, hip_joint.y / character_scale.x, hip_joint.z / character_scale.x);
        hip_root.quaternion.slerp(new Quaternion().setFromRotationMatrix(R_hips), 0.9); 

        this.computeJointParentR = function(nameSkeletonJoint, nameMpJoint, nameMpJointParent, R_chain, skeleton){
            const skeletonJoint = skeleton.getBoneByName(nameSkeletonJoint);
            const j = skeletonJoint.position.clone().normalize();
            const v = new Vector3().subVectors(this.pose3dDict[nameMpJoint], this.pose3dDict[nameMpJointParent]).normalize();
            let R = this.computeR(j, v.applyMatrix4(R_chain.clone().transpose()));
            return R;
        }

        // spines and chest
        let R_chain_spines;
        {
            let R_chain = R_hips.clone();
            const R_spine0 = this.computeJointParentR("mixamorigSpine1", "spine1", "spine0", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigSpine").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_spine0), 0.9);
            
            R_chain.multiply(R_spine0);
            const R_spine1 = this.computeJointParentR("mixamorigSpine2", "spine2", "spine1", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigSpine1").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_spine1), 0.9);
            
            R_chain.multiply(R_spine1);
            const R_spine2 = this.computeJointParentR("mixamorigNeck", "neck", "spine2", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigSpine2").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_spine2), 0.9);

            R_chain_spines = R_chain.multiply(R_spine2);
        }

        // neck and head
        {
            let R_chain = R_chain_spines.clone();
            const R_neck = this.computeJointParentR("mixamorigHead", "head", "neck", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigNeck").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_neck), 0.9);
            
            R_chain.multiply(R_neck);
            const R_headL = this.computeJointParentR("mixamorigLeftEye", "left_eye", "head", R_chain, skeleton);
            const R_headR = this.computeJointParentR("mixamorigRightEye", "right_eye", "head", R_chain, skeleton);
            const q_headL = new Quaternion().setFromRotationMatrix(R_headL);
            const q_headR = new Quaternion().setFromRotationMatrix(R_headR);
            const q_head = new Quaternion().slerpQuaternions(q_headL, q_headR, 0.5);
            skeleton.getBoneByName("mixamorigHead").quaternion.slerp(q_head, 0.9);
        }

        // left arms
        {
            let R_chain = R_chain_spines.clone();
            const R_shoulder_left = this.computeJointParentR("mixamorigLeftArm", "left_shoulder", "shoulder_left", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftShoulder").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_shoulder_left), 0.9);
            
            R_chain.multiply(R_shoulder_left);
            const R_arm = this.computeJointParentR("mixamorigLeftForeArm", "left_elbow", "left_shoulder", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftArm").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_arm), 0.9);

            R_chain.multiply(R_arm);
            const R_forearm = this.computeJointParentR("mixamorigLeftHand", "left_wrist", "left_elbow", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftForeArm").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_forearm), 0.9);
            
            R_chain.multiply(R_forearm);
            const R_hand = this.computeJointParentR("mixamorigLeftHandIndex1", "left_index", "left_wrist", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftHand").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_hand), 0.9);
        }

        // right arms
        {
            let R_chain = R_chain_spines.clone();
            const R_shoulder_right = this.computeJointParentR("mixamorigRightArm", "right_shoulder", "shoulder_right", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightShoulder").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_shoulder_right), 0.9);
            
            R_chain.multiply(R_shoulder_right);
            const R_arm = this.computeJointParentR("mixamorigRightForeArm", "right_elbow", "right_shoulder", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightArm").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_arm), 0.9);

            R_chain = R_chain.multiply(R_arm);
            const R_forearm = this.computeJointParentR("mixamorigRightHand", "right_wrist", "right_elbow", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightForeArm").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_forearm), 0.9);

            R_chain = R_chain.multiply(R_forearm);
            const R_hand = this.computeJointParentR("mixamorigRightHandIndex1", "right_index", "right_wrist", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightHand").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_hand), 0.9);
        }

        // left legs
        {
            let R_chain = R_hips.clone();
            const R_upleg = this.computeJointParentR("mixamorigLeftLeg", "left_knee", "left_hip", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftUpLeg").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_upleg), 0.9);

            R_chain = R_chain.multiply(R_upleg);
            const R_leg = this.computeJointParentR("mixamorigLeftFoot", "left_ankle", "left_knee", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftLeg").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_leg), 0.9);

            R_chain = R_chain.multiply(R_leg);
            const R_foot = this.computeJointParentR("mixamorigLeftToeBase", "left_foot_index", "left_ankle", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigLeftFoot").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_foot), 0.9);
        }

        // right legs
        {
            let R_chain = R_hips.clone();
            const R_upleg = this.computeJointParentR("mixamorigRightLeg", "right_knee", "right_hip", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightUpLeg").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_upleg), 0.9);

            R_chain = R_chain.multiply(R_upleg);
            const R_leg = this.computeJointParentR("mixamorigRightFoot", "right_ankle", "right_knee", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightLeg").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_leg), 0.9);
            
            R_chain = R_chain.multiply(R_leg);
            const R_foot = this.computeJointParentR("mixamorigRightToeBase", "right_foot_index", "right_ankle", R_chain, skeleton);
            skeleton.getBoneByName("mixamorigRightFoot").quaternion.slerp(new Quaternion().setFromRotationMatrix(R_foot), 0.9);
        }

    }

    // rotate a to b
    computeR = function(A, B) {
        // get unit vectors
        const uA = A.clone().normalize();
        const uB = B.clone().normalize();
        
        // get products
        const idot = uA.dot(uB);
        const cross_AB = new Vector3().crossVectors(uA, uB);
        const cdot = cross_AB.length();

        // get new unit vectors
        const u = uA.clone();
        const v = new Vector3().subVectors(uB, uA.clone().multiplyScalar(idot)).normalize();
        const w = cross_AB.clone().normalize();

        // get change of basis matrix
        const C = new Matrix4().makeBasis(u, v, w).transpose();

        // get rotation matrix in new basis
        const R_uvw = new Matrix4().set(
            idot, -cdot, 0, 0,
            cdot, idot, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1);
        
        // full rotation matrix
        //const R = new Matrix4().multiplyMatrices(new Matrix4().multiplyMatrices(C, R_uvw), C.clone().transpose());
        const R = new Matrix4().multiplyMatrices(C.clone().transpose(), new Matrix4().multiplyMatrices(R_uvw, C));
        return R;
    }

    // decomposes given R matrix into rotation along each axis. In this case Rz @ Ry @ Rx
    static decompose_R_ZYX = function(R) {
        const elements = R.elements;
        const thetaZ = Math.atan2(elements[1], elements[0]);
        const thetaY = Math.atan2(-elements[2], new Vector2(elements[6], elements[10]).length());
        const thetaX = Math.atan2(elements[6], elements[10]);
        return Vector3(thetaX, thetaY, thetaZ);
    }
}

export { ThreeMpPose };