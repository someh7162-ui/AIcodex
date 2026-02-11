//数据模型层 这一层定义了我们在前后端之间传输的数据“长什么样”
package com.example.demo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
//lombok注解，自动生成getter、setter、toString、equals、hashCode等方法
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String username;
    private String password;
}
