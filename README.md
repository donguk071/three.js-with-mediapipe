# three.js-with-mediapipe
project using three.js and mediapipe

# KOR

미디어파이프와 three js를 이용한 프로젝트 입니다. 
해당 코드 작동을 위해서는 영상을 넣어주거나, video가 아닌 camera사용하도록 수정하여야 합니다.
(https://google.github.io/mediapipe/solutions/holistic.html) 

## 1.face cap   

gld 모델에 mediapipe로 인식한 사용자에 표정 변화에 따라 애니메이션 적용 해당 glb모델을 threejs example 예제에서 참고하였습니다.(https://threejs.org/examples/?q=face#webgl_morphtargets_face)

![image](https://user-images.githubusercontent.com/75608078/174450356-d7a39164-67a2-45c2-a581-c924ffc56749.png)

눈, 눈썹, 입, 입꼬리 이마가 구현되어있으며 해당 모델이 사용자의 머리와 일치하여 움직이도록 하기 위한 스케일, 벡터 설정 등 다양한 작업을 확인할 수 있습니다.



## 2.rigging avatar 

glb 모델에 mediapipe로 인식한 사용자에 자세 변화에 따라 애니메이션에 적용하는 프로젝트 입니다.

![image](https://user-images.githubusercontent.com/75608078/174450842-d897ad08-dc22-4f3a-a74b-66117abd64c3.png)

서로 bone 구조가 상의하기 때문에 mapping 하는 과정등을 확인가능하며 ik solver가 적용된 결과입니다. 


## extra 

영상으로부터 facemesh 얻고 이를 위하여 구현한 여러 space간의 연산을 확인가능 합니다.

![image](https://user-images.githubusercontent.com/75608078/174450202-897e51ce-c371-4b88-b221-9dd0447fc9af.png)

# ENG
project using media pipe and three js.
In order to operate the code, the video must be inserted or modifiy code to use a camera instead of a video.
(https://google.github.io/mediapipe/solutions/holistic.html)


## 1.face cap   

![image](https://user-images.githubusercontent.com/75608078/174450356-d7a39164-67a2-45c2-a581-c924ffc56749.png)

Eye, eyebrow, mouth, and mouth-tail forehead are implemented, and you can see a variety of tasks such as scale and vector settings to make the model move in line with the user


## 2.rigging avatar 

project that applies to animation according to pose change of users by mediapipe and glb model.

![image](https://user-images.githubusercontent.com/75608078/174450842-d897ad08-dc22-4f3a-a74b-66117abd64c3.png)

the bone structure is different with each other(glb and mediapipe). So it is possible to check the mapping process and ik solver.


## extra 
You can get facemsh from the image and check the operations between the spaces which implemented for this.

![image](https://user-images.githubusercontent.com/75608078/174450202-897e51ce-c371-4b88-b221-9dd0447fc9af.png)

